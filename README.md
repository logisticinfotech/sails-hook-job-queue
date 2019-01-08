### sails-hook-job-queue with kue and redis

Kue based job queue for sails v1.1.0+. Its a wrapper around [**Kue**](https://automattic.github.io/kue/) for processing published jobs by using [**Redis**](https://redis.io/) as a queue engine.

### Dependencies

[**Redis**](https://redis.io/) (you need to install globally)

[**Kue**](https://automattic.github.io/kue/) (it will install itself)

### Installation

```
$ npm i @logisticinfotech/sails-hook-job-queue
```

### Usage

First we need to export this params globally,
We can declare it inside our development.js or production.js (config/env)
(here i am assuming that Redis server is running at `127.0.0.1:6379` on your pc)

```
redis: {
    port: 6379,
    url: "127.0.0.1"
}
```

Create `Jobs.js` inside api/services

```
module.exports = {
  _processors: {
    demoJob: function (job, cb) {
      sails.log.info("Job,job is done =>" , job.data.myParamKey);
      cb();
    },
  },
};
```

Create an action for testing a job

=> `sails generate action test-job`

Add following inside `test-job.js`

```
fn: async function (inputs, exits) {
    Jobs.create("demoJob", {myParamKey:'myParamValue'}).save(function (err) {
      return exits.success();
    });
}
```

Add entry inside our routes object

=> `'GET /test-job': { action: 'test-job' },`
