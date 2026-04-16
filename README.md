### Sails-hook-job-queue with kue and redis

Kue based job queue for sails v1.1.0+. Its a wrapper around [**Kue**](https://automattic.github.io/kue/) for processing published jobs by using [**Redis**](https://redis.io/) as a queue engine.

### Dependencies

[**Redis**](https://redis.io/) (you need to install globally)

[**Kue**](https://automattic.github.io/kue/) (it will install itself)

[**ioredis**](https://github.com/redis/ioredis) (required for TLS / `rediss://` connections — install as a peer dependency: `npm install ioredis`)

### Installation and Setup guide

Please check [this blog](https://www.logisticinfotech.com/blog/easiest-way-to-create-job-queue-in-sails-with-sails-hook-job-queue/) for step by step guide.

### Redis Configuration

Set `sails.config.redis_url` (env: `sails_redis_url`) to your Redis connection string:

```js
// config/env/production.js
module.exports = {
  redis_url: 'rediss://user:password@host:port/0',
};
```

#### Connection Modes

| URL scheme | `redis_cluster_mode` | Behavior |
|------------|---------------------|----------|
| `redis://`  | (ignored) | Plain Redis — URL passed directly to kue |
| `rediss://` | unset / `false` (default) | **Standalone ioredis with TLS** — correct for most managed providers |
| `rediss://` | `true` | **ioredis Cluster with TLS** — for clustered deployments only |

**Default behavior for `rediss://` is standalone mode.** This works with:

- DigitalOcean Managed Valkey / Redis
- Redis Cloud (Essentials & Pro non-cluster)
- Upstash
- AWS ElastiCache (cluster mode disabled)
- Azure Cache for Redis (Basic / Standard)

Only enable cluster mode if your provider explicitly runs Redis in cluster topology:

```js
// config/env/production.js
module.exports = {
  redis_url: 'rediss://user:password@host:port/0',
  redis_cluster_mode: true, // Only for clustered deployments (e.g., Azure Premium with clustering)
};
```

#### TLS Certificate Verification

By default, TLS connections verify server certificates. To disable verification (e.g., self-signed certs in development):

```js
module.exports = {
  redis_url: 'rediss://...',
  redis_tls_reject_unauthorized: false, // Default: true
};
```

### Breaking Changes in 0.1.0

- **`rediss://` URLs now default to standalone mode** instead of cluster mode. If you were relying on the previous behavior where all `rediss://` connections used `ioredis.Cluster`, set `sails.config.redis_cluster_mode = true` to restore it.
- **`rejectUnauthorized` now defaults to `true`** for TLS connections. Set `sails.config.redis_tls_reject_unauthorized = false` if you need the old behavior.
