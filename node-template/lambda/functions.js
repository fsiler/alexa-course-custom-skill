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
  }
}

module.exports = myfunctions;
