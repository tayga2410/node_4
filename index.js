const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const managers = require('./managers'); 
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
})