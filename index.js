/**
 * jobqueue hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */
var kue = require("kue");
var Job = kue.Job;
var redis = require("redis");
module.exports = function defineJobqueueHook(sails) {

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
        sails.log.info('gone after waitefor');
        initJobQueue();
      });
    }
  };

  function initJobQueue() {
    kue.redis.createClient = function () {
      var options = sails.config.redis;
      if (sails.config && sails.config.redis && sails.config.redis.url && sails.config.redis.url ) {
        options = {
          host: sails.config.redis.url,
          port: sails.config.redis.port,
          //   pass: redisUri.auth.split(":")[1],
        };
      }

      var client = redis.createClient(options.port, options.host, options);
      // Log client errors
      client.on("error", function (err) {
        sails.log.error(err);
      });

      // Authenticate, if required
      if (options.pass) {
        client.auth(options.pass, function (err) {
          if (err) sails.log.error(err);
        });
      }
      return client;
    };

    // Create job queue on Jobs service
    var processors = Jobs._processors;
    Jobs = kue.createQueue();
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
        sails.log.info("Job '" + job.type + "' (ID: " + id + ") completed successfully." + job.data);
      });
    }).on("job failed", function (id) {
      Job.get(id, function (err, job) {
        if (err) return;
        sails.log(job._error);
        sails.log("\n");
        sails.log.warn("Job '" + job.type + "' (ID: " + id + ") failed. Error: " + job._error);
      });
    });
  };
};
