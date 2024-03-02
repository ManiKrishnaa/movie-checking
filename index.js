
const express = require('express');
const axios = require('axios');

const app = express();

app.get('/search', async (req, res) => {
  const searchOptions = {
    method: 'GET',
    url: 'https://imdb8.p.rapidapi.com/title/find',
    params: {
      q: req.query.movie
    },
    headers: {
      'X-RapidAPI-Key': '0dfbda77a6msh65752b6074ec4a8p154c6ejsnea27e589985e',
      'X-RapidAPI-Host': 'imdb8.p.rapidapi.com'
    }
  };

  try {
    const searchResponse = await axios.request(searchOptions);

    if (searchResponse.data && searchResponse.data.results && searchResponse.data.results.length > 0) {
      const firstResult = searchResponse.data.results[0];
      const imdbId = extractImdbId(firstResult.id);
      if (imdbId) {
        const rating = await fetchMovieRating(imdbId);
        const responseData = {
          title: firstResult.title,
          year: firstResult.year,
          rating: rating,
          name: firstResult.principals.map(principal => principal.name),
          image: firstResult.image.url
        };
        console.log(firstResult);
        res.render('index.ejs',{data : responseData});
      } else {
        res.status(500).json({ error: "Invalid IMDb ID format" });
      }
    } else {
      res.status(404).json({ error: "No results found" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const extractImdbId = (url) => {
  const match = url.match(/\/title\/(tt\d+)\//);
  return match ? match[1] : null;
};

const fetchMovieRating = async (imdbId) => {
  const ratingsOptions = {
    method: 'GET',
    url: `https://imdb8.p.rapidapi.com/title/get-ratings`,
    params: {
      tconst: imdbId
    },
    headers: {
      'X-RapidAPI-Key': '0dfbda77a6msh65752b6074ec4a8p154c6ejsnea27e589985e',
      'X-RapidAPI-Host': 'imdb8.p.rapidapi.com'
    }
  };

  try {
    const ratingsResponse = await axios.request(ratingsOptions);

    if (ratingsResponse.data && ratingsResponse.data.rating) {
      return ratingsResponse.data.rating;
    } else {
      return "No ratings found for the movie.";
    }
  } catch (error) {
    console.error(error);
    return "Error fetching ratings";
  }
};

app.get('/', (req, res) => {
  res.render('index.ejs', { data: null });
});

app.listen(8081, () => {
  console.log("server running at port 8081");
});

