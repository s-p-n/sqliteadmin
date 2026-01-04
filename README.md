# Sqlite Admin command-line tool
This is a very bare bones sqlite admin tool. (MIT Licensed)

Installation:
```bash
npm i -g https://github.com/s-p-n/sqliteadmin.git
```

Usage:
 - Navigate to a directory with a db.
 - **Backup the db, because this tool can alter data** *(meaning, you can run update/delete queries)*
 - run the command `sqliteadmin`
```bash
cd /path/to/folder/with/db
cp ./database.db ./database.bak.db
sqliteadmin
```

Example output of:
 - Run `$ sqliteadmin` in a directory with a sqlite3 `.db` file
 - Type `1` to connect to the first db in the list.
 - Enter `select * from room_data` to browse data
```
SQLite3 Admin Tool (with PrettyJSON table rendering)

Found SQLite databases in current directory:

  1. database.db  (/home/myuser/Projects/my-project/storage/database.db)
  2. database.bak.db  (/home/myuser/Projects/my-project/storage/database.bak.db)
  3. Enter custom path

Select a database (number) or choose custom path: 1

✓ Successfully connected to: /home/myuser/Projects/my-project/storage/database.db

Available tables:

┌──────────────┐
│ table_name   │
├──────────────┤
│ users        │
│ room_data    │
│ room_members │
└──────────────┘

Enter SQL query (or "quit" to exit): select * from room_data


┌────────────────────────────────────────────────────────────────────┐
│ name             │ topic                   │ owner │ created_at    │
├──────────────────┬─────────────────────────┬───────┬───────────────┤
│ Alice's Chambers │                         │ Alice │ 1767300937980 │
│ Test Name        │ Just a test.            │ Alice │ 1767306326909 │
│ foo              │                         │ Alice │ 1767306653441 │
│ Bob's Domain     │ A place to shoot shit   │ Bob   │ 1767333793545 │
│ Zak's Vault      │                         │ Zak   │ 1767367674897 │
│ Garden of Eden   │ The best place on Earth │ Adam  │ 1767377545310 │
└──────────────────┴─────────────────────────┴───────┴───────────────┘
```

This is very bare bones and doesn't have support for db creation, schema, transactions, paging (it spits out ALL the rows) and it's mostly untested- so **USE AT YOUR OWN RISK**. 

I use it for basic crud operations on tables
