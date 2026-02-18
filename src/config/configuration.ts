export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'tutorconnect',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  },
  auth: {
    secret: process.env.AUTH_SECRET || 'secret',
    jwtExpiration: parseInt(process.env.JWT_EXPIRATION || '3600', 10),
  },
});


