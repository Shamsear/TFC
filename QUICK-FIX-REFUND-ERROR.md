# Quick Fix: REFUND Enum Error

## The Error
```
invalid input value for enum "TransactionType": "REFUND"
```

## Quick Fix (Copy & Paste)

### If you have psql access:
```bash
psql "your-connection-string" -c "ALTER TYPE \"TransactionType\" ADD VALUE 'REFUND';"
```

### Or run the script:
```bash
psql "your-connection-string" -f scripts/add-refund-transaction-type.sql
```

### Or connect to database and run:
```sql
ALTER TYPE "TransactionType" ADD VALUE 'REFUND';
```

## Done!
Now try approving a release request again. It should work.

## What it does
Adds `REFUND` as a valid transaction type so the system can record refunds when players are released.
