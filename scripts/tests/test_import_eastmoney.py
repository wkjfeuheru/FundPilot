import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import import_eastmoney as source

class ImportTests(unittest.TestCase):
    def test_money_uses_income_and_yield_instead_of_unit_nav(self):
        row = {'FSRQ': '2026-11-13', 'DWJZ': '0.215', 'LJJZ': '0.797', 'FHSP': ''}
        self.assertEqual(source.parse_nav(row, True), {'nav_date': '2026-11-13', 'unit_nav': '1.0000', 'accum_nav': '0.0000', 'per_10k_income': '0.2150', 'annualized_7d': '0.7970'})
    def test_missing_and_nonfinite_facts_are_rejected_not_zero_filled(self):
        for value in ('', '--', 'NaN', 'Infinity', 'abc'):
            with self.subTest(value=value), self.assertRaises(ValueError): source.decimal(value)
    def test_nonmoney_requires_positive_nav_and_preserves_dates(self):
        with self.assertRaises(ValueError): source.parse_nav({'FSRQ': '2026-11-13', 'DWJZ': '0', 'LJJZ': '1'}, False)
        row=source.parse_nav({'FSRQ': '2026-11-13', 'DWJZ': '2.471', 'LJJZ': '2.811'}, False)
        self.assertEqual(row['unit_nav'], '2.4710')
        self.assertEqual(row['nav_date'], '2026-11-13')
    def test_profile_facts_parse_html_entities_and_scale_yuan(self):
        profile='<table><tr><th>基金简称</th><td>A&amp;B</td><th>基金类型</th><td>指数型-股票</td></tr></table>'
        self.assertEqual(source.table_fields(profile)['基金简称'], 'A&B')
        self.assertEqual(source.size_yuan('25.81亿元（截止至：2026年09月30日）'), ('2581000000.00', '2026-09-30'))
    def test_profile_accepts_source_html_with_optional_cell_closing_tags(self):
        fields=source.table_fields('<tr><th>基金代码</th><td>000311<th>基金类型</th><td>指数型-股票</td></tr>')
        self.assertEqual(fields['基金类型'], '指数型-股票')
    def test_fee_band_selects_30_day_holding_without_inventing_rate(self):
        html='<h4>赎回费率</h4><table><tr><th>适用期限</th><th>赎回费率</th></tr><tr><td>小于7天</td><td>1.50%</td></tr><tr><td>大于等于7天，小于365天</td><td>0.50%</td></tr></table>'
        self.assertEqual(source.redeem_fee(html), ('0.5000', '大于等于7天，小于365天'))
        with self.assertRaises(ValueError): source.redeem_fee('<table><tr><td>未知档位</td><td>--</td></tr></table>')
    def test_money_explicit_no_redemption_fee_is_not_missing_data(self):
        self.assertEqual(source.redeem_fee('<h4>赎回费率</h4><table><tr><td>本基金不收取赎回费用。</td><td>0.00%</td></tr></table>'), ('0.0000', '本基金不收取赎回费用。'))
    def test_dividend_year_suffix_and_per_ten_payout_are_parsed(self):
        document='<table><tr><td>2026年</td><td>2026-06-01</td><td>2026-06-02</td><td>每10份派现金0.3400元</td><td>2026-06-03</td></tr></table>'
        self.assertEqual(source.parse_dividends(document,'2025-11-16'), [{'ex_date':'2026-06-02','per_unit_dividend':'0.0340'}])

if __name__ == '__main__': unittest.main()
