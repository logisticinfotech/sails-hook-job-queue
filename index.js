/**
 * jobqueue hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */
var kue = require("kue");
var Job = kue.Job;

// Try to use ioredis for better cluster support, fallback to redis if not available
var Redis;
try {
  Redis = require("ioredis");
} catch (e) {
  Redis = null;
}

module.exports = function jobqueue(sails) {
  return {
    initialize: async function () {
      //   var hook = this;
      var eventsToWaitFor = [];
      if (sails.hooks.orm) {
        eventsToWaitFor.push('hook:orm:loaded');
      }

      if (sails.hooks.pubsub) {
        eventsToWaitFor.push('hook:pubsub:loaded');
      }

      sails.after(eventsToWaitFor, function () {
        initJobQueue();
        sails.log.info(" 🍺   Logistic Infotech's sails-hook-job-queue loaded 🍺  ");
      });
    }
  };

  function initJobQueue() {
    // Create job queue on Jobs service
    var processors = Jobs._processors;
    var redis_url = sails.config.redis_url ? sails.config.redis_url : 'redis://127.0.0.1:6379';

    // Handle SSL connections (rediss://)
    var redisConfig;
    if (redis_url.startsWith('rediss://')) {
      try {
        if (!Redis || !Redis.Cluster) {
          throw new Error('ioredis is required for SSL Redis connections. Please install: npm install ioredis');
        }

        redisConfig = {
          createClientFactory: function() {
            var urlObj = new URL(redis_url);

            sails.log.info('Using ioredis Cluster for Azure Redis Cache with SSL');

            // Use Redis.Cluster - it handles MOVED redirects automatically and uses callbacks natively
            var client = new Redis.Cluster([
              {
                host: urlObj.hostname,
                port: parseInt(urlObj.port) || 6380
              }
            ], {
              redisOptions: {
                password: urlObj.password ? decodeURIComponent(urlObj.password) : '',
                tls: {
                  rejectUnauthorized: false // Set to true in production with proper certificates
                }
              },
              // Cluster options
              enableOfflineQueue: true, // Allow commands to queue while cluster is connecting
              maxRetriesPerRequest: 3,
              clusterRetryStrategy: function(times) {
                if (times > 10) {
                  return null;
                }
                return Math.min(times * 50, 1000);
              },
              enableReadyCheck: true
            });

            // Set up event listeners
            client.on('ready', function() {
              sails.log.info('Kue Redis Cluster ready');
            });
            client.on('connect', function() {
              sails.log.info('Kue Redis Cluster connected');
            });
            client.on('error', function(err) {
              // Don't log MOVED/ASK errors as they're handled automatically
              if (err.message && !err.message.includes('MOVED') && !err.message.includes('ASK')) {
                sails.log.error('Kue Redis Cluster error:', err);
              }
            });

            // Add kue-specific methods that it expects
            client.prefix = 'q';
            client.getKey = function(key) {
              return this.prefix + ':' + key;
            };
            client.createFIFO = function(id) {
              var idLen = '' + id.toString().length;
              var len = 2 - idLen.length;
              while (len--) idLen = '0' + idLen;
              return idLen + '|' + id;
            };
            client.stripFIFO = function(zid) {
              if (typeof zid === 'string') {
                return +zid.substr(zid.indexOf('|') + 1);
              }
              return zid;
            };

            // Return the client directly - ioredis uses callbacks natively which is what kue expects
            return client;
          }
        };

        sails.log.info('Kue Redis SSL: Using ioredis Cluster (simplified)');
      } catch (e) {
        sails.log.error('Error setting up Redis SSL client:', e);
        // Fallback to non-SSL (will likely fail but better than crashing)
        redisConfig = redis_url.replace('rediss://', 'redis://');
      }
    } else {
      redisConfig = redis_url;
    }

    Jobs = kue.createQueue({
      redis: redisConfig
    });
    Jobs._processors = processors;
    startWorker();
  }

  function startWorker() {
    logJobs();
    startProcessors();
  };

  function startProcessors() {
    for (var identity in Jobs._processors) {
      Jobs.process(identity, Jobs._processors[identity]);
    }
  };

  function logJobs() {
    Jobs.on("job complete", function (id) {
      Job.get(id, function (err, job) {
        if (err) return;
        sails.log.info("🌿   Job '" + job.type + "' (ID: " + id + ") completed successfully." + job.data);
      });
    }).on("job failed", function (id) {
      Job.get(id, function (err, job) {
        if (err) return;
        sails.log(job._error);
        sails.log("\n");
        sails.log.warn("🤯   Job '" + job.type + "' (ID: " + id + ") failed. Error: " + job._error);
      });
    });
  };
};
