sails hook job-queue with kue

Export this params globally

```
redis: {
    port: 6379,
    url: "127.0.0.1"
}
```

Install redis server
To run redis server
=> redis-server --daemonize yes


Create `Jobs.js` inside api/services
```
module.exports = { 
    _processors: {
        demoJob: function (job, cb) {
            console.error("Job,job is done");
            cb();
        },
    }
}
```

Create test an action
=> `sails generate action test-job`


Add following inside test-job.js
```
Jobs.create("demoJob", {}).save(function (err) {
    return exits.success();
});
```


Add entry inside our route object
=> `'GET /test-job': { action: 'test-job' },`