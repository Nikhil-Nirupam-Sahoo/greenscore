#!/bin/sh
set -e
export DATABASE_URL=${DATABASE_URL:-"file:./data/prod.db"}
npx prisma db push
COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(n=>{console.log(n);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})")
if [ "$COUNT" = "0" ]; then
  echo "Empty database — seeding demo data…"
  npm run seed
fi
exec npx next start -p 3000
