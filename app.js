var pg = require('pg')
var retry = require('retry')
var querystring = require('querystring');
var https = require('https');
var http = require('http');


//var fhir_host = 'cdr.tectonicsandbox.com';
var fhir_host = 'fhirtest.uhn.ca';

var kube_token = null;

var fs = require('fs')

kube_token = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token').toString();
//kube_token = fs.readFileSync('/Users/mmcroberts/.ssh/id_rsa').toString();
console.log(kube_token);

function performRequest(host, port, endpoint, method, data, token, success) {
  var dataString = JSON.stringify(data);
  var headers = {};
  
  if (method == 'GET') {
    endpoint += '?' + querystring.stringify(data);
  }
  else {
    headers = {
      'Content-Type': 'application/json',
      'Content-Length': dataString.length
    };
  }
  if (token) {
	  headers['Authorization'] = 'Bearer ' + token;
  }
  var options = {
    host: host,
	port: port,
    path: endpoint,
	rejectUnauthorized: false, 
    method: method,
    headers: headers
  };

  var req = https.request(options, function(res) {
    res.setEncoding('utf-8');

    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });

    res.on('end', function() {
      console.log('response: ' + responseString);
      var responseObject = JSON.parse(responseString);
      success(responseObject);
    });
  });

  req.write(dataString);
  req.end();
}


console.log("Hello World!")

// performRequest(fhir_host, '80', '/baseDstu3/Patient/11294/_history', 'GET', null, {
    // _pretty: "true"
// }, function(data) {
    // console.log('Fetched ' + data.resourceType);
// });

var hostname = process.env.HOSTNAME
console.log('hostname: ' + hostname )
var svc_host = process.env.KUBERNETES_SERVICE_HOST
var svc_port = process.env.KUBERNETES_PORT_443_TCP_PORT

performRequest(svc_host, svc_port, '/api/v1beta3/namespaces/default/secrets', 'GET', kube_token, {
    _pretty: "true"
}, function(data) {
    console.log('Fetched ' + data);
});

var operation = retry.operation({retries:3})

operation.attempt(function() {
  var client = new pg.Client()
  client.connect(function(e) {
    client.end()
    if(operation.retry(e)) {
      return;
    }
    if(!e) console.log("Hello Postgres!")
  })
})

