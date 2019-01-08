/**
 * jobqueue hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */
var kue = require("kue");
var Job = kue.Job;
var redis = require("redis");
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
        sails.log.info(" 🍺   Logistic Infotech's sails-hook-job-queue loaded 🍺  ");
        initJobQueue();
      });
    }
  };

  function initJobQueue() {
    kue.redis.createClient = function () {
      var url = sails.config.redis_url ? sails.config.redis_url : 'redis://127.0.0.1:6379';
      var client = redis.createClient(url, options);
      // Log client errors
      client.on("error", function (err) {
        sails.log.error(err);
      });
       
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
