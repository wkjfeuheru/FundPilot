"""Isolated acceptance fixture: only the newly registered user receives synthetic holdings/snapshots/receipts."""
import datetime, json, subprocess
from pathlib import Path
import requests

base = 'http://127.0.0.1:18082/api/v1'
s = requests.Session()
username = 'asset_acceptance_' + datetime.datetime.now().strftime('%m%d_%H%M%S')
password = 'AssetAccept1117!'
r = s.post(base + '/auth/registrations', json=dict(username=username, password=password, displayName='资产验收账户', role='INVESTOR'))
r.raise_for_status()
r = s.post(base + '/auth/sessions', json=dict(username=username, password=password)); r.raise_for_status()
auth = r.json()['data']; uid = int(auth['user']['id'])
r = s.get(base + '/funds'); r.raise_for_status(); funds = r.json()['data']['items'][:4]
assert len(funds) >= 2
today = datetime.date.today()
sql = [f"INSERT INTO holding(user_id,fund_id,shares,cost_amount) VALUES ({uid},{int(f['id'])},{(i+1)*100},100);" for i,f in enumerate(funds)]
for days, amount in [(90,48000),(60,49000),(28,50000),(15,50200),(1,50400)]:
    sql.append(f"INSERT INTO asset_snapshot(user_id,snapshot_date,total_asset,cash_balance) VALUES ({uid},'{today-datetime.timedelta(days=days)}',{amount},50000);")
for kind, state, incoming, outgoing in [(1,1,100,0),(2,2,0,80),(3,1,100,50),(4,3,100,0),(5,2,0,12)]:
    code=f'A{uid}-FIXTURE-{kind}'
    freeze=100 if state==1 and kind==1 else 50 if state==1 and kind==3 else 0
    sql.append(f"INSERT INTO trade_order(order_code,user_id,trade_type,status,trade_date,total_amount_in,total_amount_out,freeze_amount,remark) VALUES ('{code}',{uid},{kind},{state},'{today}',{incoming},{outgoing},{freeze},'资产模块验收夹具，非真实TA成交');")
    sql.append('SET @test_order=LAST_INSERT_ID();')
    sql.append(f"INSERT INTO trade_order_item(order_id,fund_id,direction,amount,shares,confirmed_amount,confirmed_shares) VALUES (@test_order,{int(funds[0]['id'])},{2 if kind==2 else 1},{incoming},10,{outgoing if state==2 else 0},{10 if state==2 else 0});")
    if state!=1:
        sql.append(f"INSERT INTO ta_receipt(order_id,receipt_no,result,confirm_date,nav_date,unit_nav,total_confirmed_amount,fail_reason,received_at) VALUES (@test_order,'R{uid}-FIXTURE-{kind}',{1 if state==2 else 2},'{today}','{today-datetime.timedelta(days=1)}',1.0000,{outgoing},{0 if state==2 else 2},UTC_TIMESTAMP(3));")
command=['docker','exec','-i','tougu-mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot tougu_auth_validation_20261116']
subprocess.run(command,input=('START TRANSACTION;\n'+'\n'.join(sql)+'\nCOMMIT;').encode(),check=True)
result={'userId':uid,'username':username,'fundIds':[f['id'] for f in funds], 'fixture':'Synthetic holdings, daily snapshots and five trade/receipt examples; only this newly created user.'}
Path('.acceptance/asset/fixture.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=True))
