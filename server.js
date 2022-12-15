const http = require('http');
const path = require("path");
const express = require("express"); 
const app = express();
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config({path:path.resolve(__dirname, './.env')});
process.stdin.setEncoding("utf8");
app.use(bodyParser.urlencoded({extended:false}));
let portNumber =8000;
const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const uri =`mongodb+srv://${username}:${password}@cluster0.gtzg2gd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });     
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION}
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(__dirname + '/templates'));
app.set("view engine", "ejs");
let host = `http://localhost:${portNumber}`;


app.get("/", (req, res) => {
    res.render("index");
});
app.get("/register", (req, res) => {
    res.render("register", {host: host+"/register"});
});
app.get("/quiz", (req, res) => {
    let variables = {
        src: "",
        dropdown: "",
        answer: "",
        host :  host+"/result"
    };
        async function main() {
            try {
                await client.connect();
                const result = await randomCountry(client, databaseAndCollection, variables);
                
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
            res.render("play", variables);
            } catch (e) {
                console.error(e);
            } finally {
                await client.close();
            }
        }
        main().catch(console.error);
});
app.post("/result", (req, res) => {
    console.log(req.body);
    res.redirect('/quiz');
});
// app.get("/api", (req, res) => {
//     let url = "https://restcountries.com/v2/all";
//     let struct = {
//         countryName:'',
//         flags:'',
//         alpha2Code:'',
//     }
//     let AllCountries =[];
//     async function main() {
//         try {
//             await client.connect();
//             const result =  await fecthApi();
//             result.forEach(e => {
//                 let struct = {
//                     countryName:e.alpha2Code,
//                     flags:e.flags?.png,
//                     alpha2Code:e.name,
//                 };
//                AllCountries.push(struct);
//             });
//             await insertCountries(client, databaseAndCollection, AllCountries);
//             res.render("play");
//         } catch (e) {
//             console.error(e);
//         } finally {
//             await client.close();
//         }
//     }
//     main().catch(console.error);
//     res.render("play");
// });
app.get("/homepage", (req, res) => {
    res.render("homepage");
});
app.post("/register", (req, res) => {
    // let variables = {
    //     firstName: req.body.firstName,
    //     lastName: req.body.lastName,
    //     email: req.body.email,
    //     password: req.body.password
    // };
    // async function main() {
    //     try {
    //         await client.connect();
    //         await insertApplication(client, databaseAndCollection, variables);
    //     } catch (e) {
    //         console.error(e);
    //     } finally {
    //         await client.close();
    //     }
    // }
    // main().catch(console.error);
    res.render("homepage");
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
async function fecthApi(url) {
    let response = await fetch('https://restcountries.com/v2/all');
    return await response.json();
}
app.listen(portNumber);