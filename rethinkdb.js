var fs = require("fs");
var os = require("os");
var _ = require("lodash");
var async = require("async");
var dns = require("native-dns");
var child_process = require("child_process");

async.parallel({
    cluster_hosts: function(fn){
        if(_.has(process.env, "CLUSTER_HOSTS"))
            return fn(null, process.env.CLUSTER_HOSTS.split(","));

        var question = dns.Question({
          name: ["followers", process.env.CS_CLUSTER_ID, "containership"].join("."),
          type: "A"
        });

        var req = dns.Request({
            question: question,
            server: { address: "127.0.0.1", port: 53, type: "udp" },
            timeout: 2000
        });

        req.on("timeout", function(){
            return fn();
        });

        req.on("message", function (err, answer) {
            var addresses = [];
            answer.answer.forEach(function(a){
                addresses.push(a.address);
            });

            return fn(null, addresses);
        });

        req.send();
    },

}, function(err, rethinkdb){
    _.defaults(rethinkdb, {
        cluster_hosts: [
            "127.0.0.1"
        ]
    });

    fs.readFile([__dirname, "rethinkdb_cluster.conf.template"].join("/"), function(err, config){
        config = config.toString();
        config = config.replace(/CLUSTER_HOSTS/g, _.map(rethinkdb.cluster_hosts, function(host){
            return ["join=", host, ":29015"].join("");
        }).join("\n"));

        fs.writeFile(process.env.RETHINKDB_CONFIG, config, function(err){
            if(err)
                process.exit(1);

            child_process.spawn("/usr/bin/rethinkdb", ["--bind", "all", "--config-file", process.env.RETHINKDB_CONFIG], {
                stdio: "inherit"
            }).on("error", function(err){
                process.stderr.write(err);
            });
        });
    });
});
