const myfunctions = {
  getQuote: function(quotes, author) {
    console.log("quoteFunction");

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
    console.log(`author ${author}, lookupAuthor ${lookupAuthor}`);

    const numQuotes = quotes[lookupAuthor].length;
    const lookupIndex = Math.floor(Math.random() * numQuotes);
    const quote = quotes[lookupAuthor][lookupIndex] || "Sorry, I couldn't find a quote by that author";
    return [lookupAuthor, quote];
  }
}

module.exports = myfunctions;
