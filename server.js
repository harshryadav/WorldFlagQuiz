const http = require('http');
const path = require("path");
const express = require("express"); 
const app = express();
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config({path:path.resolve(__dirname, './.env')});
process.stdin.setEncoding("utf8");
app.use(bodyParser.urlencoded({extended:false}));
let portNumber =process.env.PORT || 8000;
const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const uri =`mongodb+srv://${username}:${password}@cluster0.gtzg2gd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });     
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION, collectionApi: process.env.MONGO_COLLECTION_COUNTRY};
const databaseAndCollectionAPI = {db: process.env.MONGO_DB_NAME,  collection: process.env.MONGO_COLLECTION_COUNTRY};
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(__dirname + '/templates'));
app.set("view engine", "ejs");
let hostName = process.env_API_URL || "http://localhost";
let host = `${hostName}:${portNumber}`;
if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
  }
let score = 0, playScore = 7, guesses=1, bestScore = 0;
app.get("/", (req, res) => {
    if(localStorage.getItem("email") === null && localStorage.getItem("password") === null){
        res.render("index", {host: host+"/signIn", error: false});
    }else{
        
        res.render("homepage",{best :bestScore});
    }
});
app.get("/register", (req, res) => {
    res.render("register", {host: host+"/register"});
});
app.get("/logout", (req, res) => {
    localStorage.removeItem("email");
    localStorage.removeItem("password");
    res.render("index", {host: host+"/signIn", error: false});
});

app.post("/signIn", (req, res) => {
    let variables ={
        email: req.body.email,
        password: req.body.password,
        
    }
    async function main() {
        try {
            await client.connect();
            const result = await lookUpUser(client, databaseAndCollection, variables);
            if(result!== null){
                localStorage.setItem("email", result.email);
                localStorage.setItem("password",result.password);
                bestScore = result.score;
                res.render("homepage", {best :result.score});     
            }else{
                variables.host =host+"/signIn";
                variables.error=  true;
                res.render("index", variables);
            }
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);
});
app.get('/LeaderBoard', (req, res) => {
    let variables = {
        resultTable: "NONE"
    };
    async function main() {
        try {
            await client.connect();
            const result = await getAllUsers(client, databaseAndCollection);
            
            if(result?.length !== 0){
                let table ="<table  class='table'> <tr><th>Name</th><th>Score</th></tr>";
                // table += `<tr><td>${result.firstName}- ${result.lastName} </td><td>${result.score}</td></tr>`;
                result.forEach(element => {
                    table += `<tr><td>${element.firstName}- ${element.lastName} </td><td>${element.score}</td></tr>`
                });
                table+= "</table>";
                variables.resultTable = table;
                
            }
            res.render("leaderBoard", variables);
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);
});
app.get("/quiz", (req, res) => {
    if(localStorage.getItem("email") === null && localStorage.getItem("password") === null){
        res.render("index", {host: host+"/signIn", error: false});
    }else{
        let variables = {
            src: "",
            dropdown: "",
            answer: "",
            host :  host+"/result"
        };
            async function main() {
                try {
                    await client.connect();
                    const result = await randomCountry(client, databaseAndCollectionAPI, variables);
                    if(result?.length !== 0){
                        variables.src = result[0].flags;
                        variables.answer = result[0].alpha2Code;
                        const randomly = () => Math.random() - 0.5;
                        const dynamicRes = [].concat(result).sort(randomly);
                        const traitInfo = Array(5).fill({});
                        traitInfo.forEach((t, i) => {
                            variables.dropdown += `<button type="radio" name="selected" class="form-control form-control-sm mb-3" value="${dynamicRes[i].alpha2Code}">${dynamicRes[i].alpha2Code}</button>`
                    
                        });
                    }
                    variables.score = score;
                    variables.playScore = playScore;
                res.render("play", variables);
                } catch (e) {
                    console.error(e);
                } finally {
                    await client.close();
                }
            }
            main().catch(console.error);
    }
    
});
app.post("/result", (req, res) => {
    
    if(guesses <= playScore){
        guesses++;
        if(req.body.selected.includes(req.body.answer)){
            score++;
        }
        res.redirect('/quiz');
    }else{
        guesses++;
        // update user score
        let variables = {};
        if(localStorage.getItem('email') !== null){
            async function main() {
                try {
                    await client.connect();
                    variables.email = localStorage.getItem('email');
                    const result = await lookUpUser(client, databaseAndCollection, variables);
                    
                    if(result!== null){
                        if(result.score < score){
                            await client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .updateOne(
                                {email: result.email},
                                {$set :{ "score" : score}}
                            )
                        }
                        guesses = 1;
                        score = 0;
                        bestScore = result.score;
                        res.render("homepage",{best :result.score});
                    }else{
                        guesses = 1;
                        score = 0;    
                        variables.host =host+"/signIn";
                        variables.error=  true;
                        res.render("index", variables);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    await client.close();
                }
            }
            main().catch(console.error);
        }
        
    }   
});
app.get("/viewCountries", (req, res) => {
    let variables = {
        src: "",
        answer: "",
    };
        async function main() {
            try {
            // USED API HERE 
            let url = "https://restcountries.com/v2/all"
            let result = await fecthApi(url);
            let index = Math.floor(Math.random() * result.length - 1); 
            variables.src = result[index].flags?.png;
            variables.answer = result[index].name;
            res.render("countries", variables);
            } catch (e) {
                console.error(e);
            } 
        }
        main().catch(console.error);

});
app.get("/search", (req, res) => {
    let variables = {
        src: "",
        answer: "",
        message: "",
        not_found: false,
        host: host+"/search"
    };
    res.render("searchCountry", variables);
});
app.get("/searchQuery", (req, res) => {
    let variables = {
        src: "",
        answer: "",
        message: "",
        not_found: false,
        host: host+"/search"
    };
    let url = `https://restcountries.com/v2/name/${req?.query?.countryName.toLowerCase()}`
    async function main() {
        try {
        let result = await fecthApi(url);
        if(result !== "Not Found"){
            variables.src = result[0]?.flags?.png;
            variables.answer = result[0]?.name;
            variables.not_found = true;
        }else{
            variables.message = "The country Name you searched is not available or maybe the typo is invalid";
        }
        res.render("searchCountry", variables);
        
        } catch (e) {
            console.error(e);
        } 
    }
    main().catch(console.error);

});


app.get("/api", (req, res) => {
    let url = "https://restcountries.com/v2/all";
    let struct = {
        countryName:'',
        flags:'',
        alpha2Code:'',
    }
    let AllCountries =[];
    async function main() {
        try {
            await client.connect();
            const result =  await fecthApi();
            result.forEach(e => {
                let struct = {
                    countryName:e.alpha2Code,
                    flags:e.flags?.png,
                    alpha2Code:e.name,
                };
               AllCountries.push(struct);
            });
            await insertCountries(client, databaseAndCollectionAPI, AllCountries);
            bestScore = result.score;
            res.render("homepage" ,{best :bestScore});
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);
    
});
app.get("/homepage", (req, res) => {
    if(localStorage.getItem("email") === null && localStorage.getItem("password") === null){
        res.render("index", {host: host+"/signIn", error: false});
    }else{
        
        res.render("homepage",{best :bestScore});
    }
});
app.post("/register", (req, res) => {
    let variables = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        score: 0 
    };
    async function main() {
        try {
            await client.connect();
           const result =  await insertApplication(client, databaseAndCollection, variables);
           if(result !== null) {
                localStorage.setItem("email", password.email);
                localStorage.setItem("password",password.password);
                bestScore = result.score;
                res.render("homepage",{best :bestScore});
           }else{
            variables.host = host+"/register";
                res.render("register", variables);
           }
          
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    main().catch(console.error);
});
console.log(`Web server started and running at http://localhost:${portNumber}`);

async function insertApplication(client,databaseAndCollection, newApp){
    return await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .insertOne(newApp);
    
}

async function insertCountries(client,databaseAndCollection, newApp){
    return await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .insertMany(newApp);
    
}
async function lookUpCountry(client, databaseAndCollection, countryName) {
    let filter = {countryName: countryName};
    return await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
}

async function randomCountry(client, databaseAndCollection) {
    let filter = [{$sample: {size: 5}}];
    let cursor = client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .aggregate(filter)

    return await cursor.toArray();
}
async function lookUpUser(client, databaseAndCollection, filter) {
    return await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
}

async function getAllUsers(client, databaseAndCollection) {
    
    const cursor = client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection).find({score: { $gte: 0 } }).sort({score:-1});
    return await cursor.toArray();
}
async function updateUser(client, databaseAndCollection, filter) {
    return await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .updateOne(filter);
}
async function fecthApi(url) {
    return  await fetch(url)
                    .then(response=> {
                        if(response.status === 404){
                            return "Not Found";
                        }
                        return  response.json();
                    });
                        
}
app.listen(portNumber);