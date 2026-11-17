"""Low-volume Eastmoney snapshot -> validated facts -> reviewable MySQL SQL.

No JavaScript execution, DB credentials, schema creation or automatic DB writes.
Run: python scripts/import_eastmoney.py --output docs/data/funds/20261116
Replay: add --offline (requires saved response files and source metadata).
"""
import argparse
import datetime as dt
import hashlib
import html
import json
import re
import time
import urllib.request
from html.parser import HTMLParser
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

# System classifications are explicit configuration, not claimed as source facts.
FUNDS = {
    '000311': (1, 4, '股票指数增强，映射权益 / R4'),
    '110027': (2, 3, '混合二级债券基金，映射债券 / R3；并非纯债'),
    '000198': (3, 1, '货币基金，映射货币 / R1'),
    '000217': (4, 4, '黄金 ETF 联接，映射黄金 / R4'),
}

def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', '', value))).strip()

def decimal(value, places=4):
    try:
        number = Decimal(str(value).strip().replace('%', ''))
        if not number.is_finite():
            raise ValueError('nonfinite decimal')
        return format(number.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP), 'f')
    except (InvalidOperation, TypeError) as error:
        raise ValueError(f'Invalid decimal: {value!r}') from error

def rows(document):
    class TableParser(HTMLParser):
        def __init__(self):
            super().__init__(); self.result=[]; self.row=[]; self.cell=None
        def finish_cell(self):
            if self.cell is not None:
                self.row.append(re.sub(r'\s+', ' ', ''.join(self.cell)).strip()); self.cell=None
        def handle_starttag(self, tag, attrs):
            if tag == 'tr': self.finish_cell(); self.row=[]
            if tag in ('td', 'th'): self.finish_cell(); self.cell=[]
        def handle_endtag(self, tag):
            if tag in ('td', 'th'): self.finish_cell()
            if tag == 'tr': self.finish_cell(); self.result.append(self.row); self.row=[]
        def handle_data(self, data):
            if self.cell is not None: self.cell.append(data)
    parser=TableParser();parser.feed(document);return parser.result

def table_fields(document):
    fields = {}
    for row in rows(document):
        for index in range(0, len(row) - 1, 2):
            fields[row[index]] = row[index + 1]
    return fields

def chinese_date(value):
    match = re.search(r'(\d{4})[年-](\d{1,2})[月-](\d{1,2})', value)
    if not match:
        raise ValueError(f'Missing date: {value!r}')
    return dt.date(*map(int, match.groups())).isoformat()

def size_yuan(value):
    match = re.search(r'([\d.]+)亿元', value)
    if not match:
        raise ValueError('Missing fund size')
    return decimal(Decimal(match[1]) * 100000000, 2), chinese_date(value)

def parse_nav(row, money):
    date = dt.date.fromisoformat(row['FSRQ'])
    if date > dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date():
        raise ValueError('Future NAV date')
    value = decimal(row['DWJZ'])
    accumulated = decimal(row['LJJZ'])
    if not money and Decimal(value) <= 0:
        raise ValueError('Unit NAV must be positive')
    return {'nav_date': date.isoformat(), 'unit_nav': '1.0000' if money else value,
            'accum_nav': '0.0000' if money else accumulated,
            'per_10k_income': value if money else '0.0000',
            'annualized_7d': accumulated if money else '0.0000'}

def redeem_fee(document):
    match = re.search(r'赎回费率.*?<table\b[^>]*>(.*?)</table>', document, re.S)
    if not match:
        raise ValueError('Missing redemption fee table')
    for row in rows(match[1]):
        if len(row) != 2 or not re.fullmatch(r'[\d.]+%', row[1]):
            continue
        band = row[0]
        if band == '本基金不收取赎回费用。' and Decimal(row[1].rstrip('%')) == 0:
            return decimal(row[1]), band
        conditions = re.findall(r'(大于等于|小于等于|大于|小于)(\d+)(天|年|月)', band)
        if conditions:
            def accepts(condition):
                operator, value, unit = condition
                days = int(value) * {'天': 1, '月': 30, '年': 365}[unit]
                return {'大于等于': 30 >= days, '小于等于': 30 <= days, '大于': 30 > days, '小于': 30 < days}[operator]
            if all(map(accepts, conditions)):
                return decimal(row[1]), band
        elif band in ('---', '--', '不限', '全部'):
            return decimal(row[1]), '不限持有期'
    raise ValueError('Cannot identify the 30-day redemption fee band')

def js_string(document, variable):
    match = re.search(r'\bvar\s+' + re.escape(variable) + r'\s*=\s*("(?:[^"\\]|\\.)*")\s*;', document)
    if not match:
        raise ValueError(f'Missing source variable: {variable}')
    return json.loads(match[1])

def parse_dividends(document, start):
    events = {}
    for row in rows(document):
        if len(row) != 5 or not re.fullmatch(r'\d{4}年?', row[0]):
            continue
        # Split tables have four columns; only the five-column cash-dividend table is read.
        dates = [v for v in row if re.fullmatch(r'\d{4}-\d{2}-\d{2}', v)]
        payout = next((re.search(r'每(\d+)份(?:基金份额)?派(?:发)?现(?:金)?([\d.]+)元', v) for v in row if '派' in v), None)
        if not dates or not payout:
            raise ValueError(f'Unrecognized dividend row: {row}')
        # Page columns: year, record date, ex-dividend date, per-ten payout, payment date.
        ex_date = dates[1] if len(dates) > 1 else dates[0]
        if ex_date >= start:
            events[ex_date] = decimal(Decimal(payout[2]) / Decimal(payout[1]))
    return [{'ex_date': date, 'per_unit_dividend': value} for date, value in sorted(events.items())]

class Snapshot:
    def __init__(self, root, offline):
        self.root, self.offline, self.sources = root, offline, []
        root.mkdir(parents=True, exist_ok=True)
    def get(self, filename, url):
        path = self.root / filename
        meta_path = self.root / (filename + '.source.json')
        if self.offline:
            body = path.read_bytes()
            metadata = json.loads(meta_path.read_text(encoding='utf-8'))
            if metadata['url'] != url or metadata['sha256'] != hashlib.sha256(body).hexdigest():
                raise ValueError(f'Source snapshot mismatch: {filename}')
        else:
            time.sleep(0.35)
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://fundf10.eastmoney.com/'})
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read(8 * 1024 * 1024 + 1)
                if len(body) > 8 * 1024 * 1024:
                    raise ValueError('Source response too large')
            metadata = {'file': filename, 'url': url, 'fetchedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'sha256': hashlib.sha256(body).hexdigest()}
            path.write_bytes(body)
            meta_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
        self.sources.append(metadata)
        return body.decode('utf-8-sig')

def collect(code, snapshot, start):
    asset_type, risk, mapping = FUNDS[code]
    profile = snapshot.get(f'{code}-profile.html', f'https://fundf10.eastmoney.com/jbgk_{code}.html')
    fees = snapshot.get(f'{code}-fees.html', f'https://fundf10.eastmoney.com/jjfl_{code}.html')
    trend = snapshot.get(f'{code}-trend.js', f'https://fund.eastmoney.com/pingzhongdata/{code}.js')
    dividend_html = snapshot.get(f'{code}-dividends.html', f'https://fundf10.eastmoney.com/fhsp_{code}.html')
    fields = table_fields(profile)
    navs, raw_latest, expected_count = {}, None, None
    for page in range(1, 31):
        url = f'https://api.fund.eastmoney.com/f10/lsjz?fundCode={code}&pageIndex={page}&pageSize=20&startDate={start}'
        response = json.loads(snapshot.get(f'{code}-nav-{page}.json', url))
        if response['ErrCode'] != 0 or not isinstance(response.get('Data'), dict) or not isinstance(response['Data'].get('LSJZList'), list):
            raise ValueError('Invalid NAV API response')
        entries = response['Data']['LSJZList']
        if expected_count is None:
            expected_count = response['TotalCount']
        if response['TotalCount'] != expected_count or response['PageIndex'] != page or response['PageSize'] != 20:
            raise ValueError('Source pagination changed during collection; retry the snapshot')
        for row in entries:
            parsed = parse_nav(row, asset_type == 3)
            if parsed['nav_date'] < start:
                raise ValueError('NAV response ignores start date')
            old = navs.get(parsed['nav_date'])
            if old is not None and old != parsed:
                raise ValueError('Conflicting duplicate NAV')
            navs[parsed['nav_date']] = parsed
            if raw_latest is None or row['FSRQ'] > raw_latest['FSRQ']:
                raw_latest = row
        if page * 20 >= response['TotalCount']:
            break
    else:
        raise ValueError('Unexpected source volume')
    if not navs or len(navs) != expected_count:
        raise ValueError('Incomplete NAV history')
    size, size_date = size_yuan(fields['净资产规模'])
    redemption, band = redeem_fee(fees)
    purchase = {'开放申购': 1, '限大额': 2, '限制大额申购': 2, '暂停申购': 3, '封闭期': 3}
    redeem = {'开放赎回': 1, '暂停赎回': 2, '封闭期': 2}
    latest = navs[max(navs)]
    # Fee pages explicitly display zero for money funds; missing rates still fail.
    rate = js_string(trend, 'fund_Rate')
    fund = {'fund_code': code, 'name': fields['基金简称'], 'fund_type': asset_type, 'risk_level': risk,
            'category_label': fields['基金类型'], 'style_tags': '[]', 'company': fields['基金管理人'],
            'manager': fields['基金经理人'], 'fund_size': size, 'fund_size_as_of_date': size_date,
            'inception_date': chinese_date(fields['成立日期/规模']), 'benchmark': fields['业绩比较基准'],
            'latest_nav': latest['unit_nav'], 'latest_nav_date': latest['nav_date'],
            'return_1y': '0.0000' if asset_type == 3 else decimal(js_string(trend, 'syl_1n')),
            'purchase_status': purchase[raw_latest['SGZT'].strip()], 'redeem_status': redeem[raw_latest['SHZT'].strip()],
            'fee_purchase': decimal(rate), 'fee_redeem': redemption,
            'fee_manage': decimal(re.search(r'[\d.]+%', fields['管理费率'])[0]),
            'fee_custodian': decimal(re.search(r'[\d.]+%', fields['托管费率'])[0]),
            'fee_sales_service': decimal(re.search(r'[\d.]+%', fields['销售服务费率'])[0]),
            'pool_rating': 0, 'is_pool_eligible': 0, 'data_source': 'EASTMONEY',
            'data_synced_at': dt.datetime.fromisoformat(snapshot.sources[-1]['fetchedAt']).astimezone(dt.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:23]}
    for column, limit in {'name': 128, 'company': 64, 'manager': 128, 'benchmark': 128, 'category_label': 64}.items():
        if not fund[column] or len(fund[column]) > limit:
            raise ValueError(f'{code}: missing or oversized {column}')
    return {'fund': fund, 'navs': list(sorted(navs.values(), key=lambda n: n['nav_date'])),
            'dividends': parse_dividends(dividend_html, start), 'mapping': mapping, 'redeemFeeBand': band}

def sql_value(value):
    if isinstance(value, int):
        return str(value)
    # Hex literals avoid quoting / SQL-mode ambiguity for source text.
    return "CONVERT(X'" + str(value).encode('utf-8').hex() + "' USING utf8mb4)"

def generate_sql(bundles):
    output = ["-- Generated reviewed facts only; select the target database explicitly with mysql DATABASE.",
              "SET NAMES utf8mb4;", "SET time_zone='+00:00';",
              "CREATE TEMPORARY TABLE import_assertion(valid TINYINT NOT NULL CHECK(valid=1));", "START TRANSACTION;"]
    for item in bundles:
        fund = item['fund']
        code = sql_value(fund['fund_code'])
        # Reject deleted records instead of silently resurrecting them.
        output.append(f"INSERT INTO import_assertion SELECT 0 FROM fund WHERE fund_code={code} AND deleted_at<>'1970-01-01 00:00:00.000';")
        columns = list(fund)
        mutable = [c for c in columns if c not in ('fund_code', 'latest_nav', 'latest_nav_date', 'pool_rating', 'is_pool_eligible', 'style_tags')]
        updates = ','.join(f'{c}=IF(data_synced_at<=VALUES(data_synced_at),VALUES({c}),{c})' for c in mutable if c != 'data_synced_at')
        updates += ',data_synced_at=GREATEST(data_synced_at,VALUES(data_synced_at))'
        output.append(f"INSERT INTO fund ({','.join(columns)}) VALUES ({','.join(sql_value(fund[c]) for c in columns)}) ON DUPLICATE KEY UPDATE {updates};")
        output.append(f"SET @fund_id=(SELECT id FROM fund WHERE fund_code={code});")
        for table, data, key in [('fund_nav', item['navs'], 'nav_date'), ('fund_dividend', item['dividends'], 'ex_date')]:
            if not data:
                continue
            cols = list(data[0])
            temp = 'stage_' + table
            output.append(f"CREATE TEMPORARY TABLE {temp} LIKE {table};")
            values = ',\n'.join('(@fund_id,' + ','.join(sql_value(row[c]) for c in cols) + ')' for row in data)
            output.append(f"INSERT INTO {temp}(fund_id,{','.join(cols)}) VALUES {values};")
            conflicts = ' OR '.join(f'a.{c}<>b.{c}' for c in cols if c != key)
            output.append(f"INSERT INTO import_assertion SELECT 0 FROM {table} a JOIN {temp} b ON a.fund_id=b.fund_id AND a.{key}=b.{key} WHERE {conflicts} OR a.deleted_at<>'1970-01-01 00:00:00.000';")
            output.append(f"INSERT INTO {table}(fund_id,{','.join(cols)}) SELECT b.fund_id,{','.join('b.'+c for c in cols)} FROM {temp} b LEFT JOIN {table} a ON a.fund_id=b.fund_id AND a.{key}=b.{key} WHERE a.id IS NULL;")
            output.append(f"DROP TEMPORARY TABLE {temp};")
        output.append("UPDATE fund f JOIN fund_nav n ON n.fund_id=f.id AND n.nav_date=(SELECT MAX(x.nav_date) FROM fund_nav x WHERE x.fund_id=f.id AND x.deleted_at='1970-01-01 00:00:00.000') SET f.latest_nav=n.unit_nav,f.latest_nav_date=n.nav_date WHERE f.id=@fund_id;")
    output += ['COMMIT;', 'DROP TEMPORARY TABLE import_assertion;']
    return '\n'.join(output) + '\n'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--codes', nargs='+', choices=list(FUNDS), default=list(FUNDS))
    parser.add_argument('--start', default='2025-11-16')
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    dt.date.fromisoformat(args.start)
    snapshot = Snapshot(args.output, args.offline)
    bundles = []
    for code in args.codes:
        item = collect(code, snapshot, args.start)
        bundles.append(item)
        print(f"{code}: {item['fund']['name']}, {len(item['navs'])} NAV rows, {len(item['dividends'])} dividends", flush=True)
    manifest = {'start': args.start, 'sources': snapshot.sources, 'funds': bundles,
                'notes': ['System asset/risk classification is not an official suitability rating.', 'Redemption fee uses the band applicable to a 30-day holding.', 'No pool rating or eligibility granted.', 'NAV history is unadjusted; source corrections cause an import conflict.']}
    args.output.joinpath('manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    args.output.joinpath('import.sql').write_text(generate_sql(bundles), encoding='utf-8')
    print('Validated snapshot and SQL generated; no database was modified.', flush=True)

if __name__ == '__main__':
    main()
