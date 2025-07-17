@echo off
echo Installing voting system dependencies...

echo.
echo Installing Node.js dependencies...
npm install

echo.
echo Installing additional dependencies for voting system...
npm install @next-auth/prisma-adapter @prisma/client prisma next-auth zod socket.io socket.io-client redis jsonwebtoken @types/jsonwebtoken @radix-ui/react-radio-group @radix-ui/react-tabs date-fns

echo.
echo Setting up Prisma...
npx prisma generate

echo.
echo Creating environment file if it doesn't exist...
if not exist .env (
    copy .env.example .env
    echo Please configure your .env file with the required environment variables
)

echo.
echo Installation complete!
echo.
echo Next steps:
echo 1. Configure your .env file with database and authentication settings
echo 2. Set up your PostgreSQL database
echo 3. Run: npx prisma db push
echo 4. Run: npm run dev
echo.
pause