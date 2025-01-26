const myfunctions = {
  getQuote: function(quotes, author) {
    console.log("quoteFunction");

    if(author === undefined) {
       const totalauthors = Object.keys(quotes).length;
       const rand = Math.floor(Math.random() * totalauthors);

       author = Object.keys(quotes)[rand];
    }

    const mapping = {
      'lincoln':'Lincoln',
      'einstein': 'Einstein',
      'abe':'Lincoln',
      'abraham lincoln':'Lincoln'
    }
    const lookupAuthor = mapping[author.toLowerCase()];

    const numQuotes = quotes[lookupAuthor].length;
    const lookupIndex = Math.floor(Math.random() * numQuotes);
    const quote = quotes[lookupAuthor][lookupIndex];
    return [lookupAuthor, quote];
  }
}

module.exports = myfunctions;
