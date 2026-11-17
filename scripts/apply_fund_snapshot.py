"""Apply an already-reviewed local snapshot to an explicitly named demo database.

Uses the local MySQL container's existing MYSQL_ROOT_PASSWORD without printing it.
MySQL batch mode stops on the first error (no --force); closing the connection
rolls back the uncommitted batch. No schema changes or database creation.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path
from import_eastmoney import Snapshot, collect, generate_sql

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot',type=Path,required=True)
    parser.add_argument('--database',required=True)
    parser.add_argument('--container',default='tougu-mysql')
    args=parser.parse_args()
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,63}',args.database):
        parser.error('Invalid database identifier')
    manifest=json.loads((args.snapshot/'manifest.json').read_text(encoding='utf-8'))
    snapshot=Snapshot(args.snapshot,True)
    bundles=[collect(item['fund']['fund_code'],snapshot,manifest['start']) for item in manifest['funds']]
    sql=generate_sql(bundles)
    if bundles != manifest['funds'] or sql != (args.snapshot/'import.sql').read_text(encoding='utf-8'):
        parser.error('Snapshot facts or SQL differ from verified source files; regenerate and review')
    command=['docker','exec','-i',args.container,'sh','-c',
             'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --default-character-set=utf8mb4 -uroot -N -B '+args.database]
    result=subprocess.run(command,input=sql.encode('utf-8'),capture_output=True)
    if result.returncode:
        raise SystemExit('Import failed; connection closed and transaction rolled back.\n'+result.stderr.decode('utf-8',errors='replace'))
    print(f'Imported {len(bundles)} funds into {args.database}; history is append-only.')

if __name__=='__main__': main()
