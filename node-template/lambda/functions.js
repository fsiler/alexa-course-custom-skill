const myfunctions = {
  getQuote: function(quotes, author) {
    if(author === undefined) {
       const totalauthors = Object.keys(quotes).length;
       const rand = Math.floor(Math.random() * totalauthors);

       author = Object.keys(quotes)[rand];
    }

    const mapping = {
      'abe':'Lincoln',
      'honest abe':'Lincoln',
      'abraham lincoln':'Lincoln',
      'abe lincoln':'Lincoln',
      'lincoln':'Lincoln',
      'einstein': 'Einstein',
      'albert einstein': 'Einstein',
    }
    const lookupAuthor = mapping[author.toLowerCase()];
    if(lookupAuthor === undefined) {
      return [false, undefined]
    }

    const numQuotes = quotes[lookupAuthor].length;
    const lookupIndex = Math.floor(Math.random() * numQuotes);
    const quote = quotes[lookupAuthor][lookupIndex]
    return [lookupAuthor, quote];
  },
getData: function(options, postData) {
    return new Promise(function(resolve,reject) {
      var request = https.request(options, function(response) {
        // reject if status is not 2xxx
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(new Error("statusCode=" + response.statusCode));
        }
        
        // Status is in 2xx
        // cumulate data
        var body = [];
        response.on("data", function (chunk) {
          body.push(chunk);
        });
        
        // when process ends
        response.on("end", function() {
          try {
            body = JSON.parse(Buffer.concat(body).toString());
            // use just 'body' for non JSON input
          } catch (error) {
            reject(error);
          }
          resolve(body);
        });
      });

      // manage other request errors
      request.on("error", function(error) {
        reject(error);
      });

      // POST data (optional)
      if (postData) {
        request.write(postData);
      }
      
      // End the request. It's Important
      request.end();
    }); // promise ends
  }
};

module.exports = myfunctions;
