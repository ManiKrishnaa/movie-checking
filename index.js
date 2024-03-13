const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

mongoose.connect('mongodb+srv://manikrishna9970:manikrishna9970@nani.8rxselx.mongodb.net/peopledata')
    .then(() => {
        console.log("Connected to the database");
    })
    .catch((error) => {
        console.error("Error connecting to the database:", error);
    });

const itemschema = new mongoose.Schema({
    name : String,
    username: String,
    password: String
});

const diaryEntrySchema = new mongoose.Schema({
    username: String,
    movieTitle: String,
    dateAdded: {
        type: Date,
        default: Date.now
    }
});

const DiaryEntry = mongoose.model('DiaryEntry', diaryEntrySchema);
const Item = mongoose.model('Item', itemschema);

app.get('/login', (req, res) => {
    res.render('login', { error: null }); 
});

app.get('/', async (req, res) => {
    res.render('index', { error: null });
});

app.post('/checklogin', async (req, res) => {
    const { uname, pwd } = req.body;

    try {
        const user = await Item.findOne({ username: uname });
        if (!user) {
            return res.render('login', { error: 'Invalid username/password' });
        }

        const isPasswordValid = await bcrypt.compare(pwd, user.password);
        if (!isPasswordValid) {
            return res.render('login', { error: 'Invalid username/password' });
        }
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error logging in:', error);
        res.render('login', { error: 'An error occurred while logging in' });
    }
});

app.get('/reg',(req,res)=>{
    res.render('register',{error: null});
});

app.post('/register', async (req, res) => {
    const { name, username, pwd } = req.body;

    try {
        const existingUser = await Item.findOne({ username: username });
        if (existingUser) {
            return res.render('register', { error: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(pwd, 10);
        const newUser = new Item({ name, username, password: hashedPassword });
        
        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        console.error('Error registering user:', error);
        res.render('register', { error: 'An error occurred while registering the user' });
    }
});

app.post('/update-profile', async (req, res) => {
    const { name, password } = req.body;
    const username = req.session.username;

    try {
        const user = await Item.findOneAndUpdate({ username: username }, { name, password });
        if (!user) {
            return res.redirect('/dashboard?error=User not found');
        }
        res.redirect('/dashboard?success=Profile updated successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.redirect('/dashboard?error=An error occurred while updating profile');
    }
});

app.get('/dashboard', async (req, res) => {
    try {
        const diaryEntries = await DiaryEntry.find({ username: req.session.username });
        const successMessage = req.query.success;
        const errorMessage = req.query.error;
        res.render('dashboard', { successMessage, errorMessage, data: {}, diaryEntries });
    } catch (error) {
        console.error('Error fetching diary entries:', error);
        res.render('dashboard', { successMessage: null, errorMessage: 'Error fetching diary entries', data: {}, diaryEntries: [] });
    }
});

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

          const diaryEntries = await DiaryEntry.find({ username: req.session.username });

          res.render('dashboard.ejs', { data: responseData, diaryEntries: diaryEntries });
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

app.post('/add-to-diary', async (req, res) => {
    const { movieTitle, username } = req.body;
    try {
        const newEntry = new DiaryEntry({
            username: username,
            movieTitle: movieTitle
        });
        await newEntry.save();

        res.status(200).send({ message: 'Movie added to diary successfully' });
    } catch (error) {
        console.error('Error adding movie to diary:', error);
        res.status(500).send({ message: 'An error occurred while adding movie to diary' });
    }
});

app.listen(8080, () => {
    console.log("Server connected to port 8080");
});
