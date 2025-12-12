const Fastify = require('fastify');
const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', service: 'hacksentry-api' }));

const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();
