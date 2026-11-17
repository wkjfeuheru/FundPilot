import base from '../../frontend/vite.config.ts'
export default (env) => { const c = base({...env, mode: 'investor'}); c.cacheDir='node_modules/.vite/asset-acceptance'; c.server.port=15174; c.server.strictPort=true; c.server.proxy['/api'].target='http://127.0.0.1:18082'; return c; }
