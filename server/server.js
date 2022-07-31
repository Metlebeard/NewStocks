//INCLUDE EXTERNAL LIBRARIES - - -
const path = require('path'); //re-routing library
const http = require('http'); //server creating library
const fs = require('fs'); //file reader library
const express = require('express'); //server running library
const socketIO = require('socket.io'); //client input/output library

//SERVER SET UP - - -
const publicPath = path.join(__dirname, '/../public'); //link public folder
const port = process.env.PORT || 2244; //set port to 2244
let app = express(); //create server functionality
let server = http.createServer(app); //create server
let io = socketIO(server); //allow client connections
app.use(express.static(publicPath)); //redirect clients to index.html in public

var day = 1;
var playersOnline = 0;
var players = [];
var playerID = 0;

var leaderBoard = [];

//ROYGBIV (Red, Orange, Yellow, Green, Blue, Indigo, Violet)
var businessOwners = ["Mr. Red", "Prof. Orange", "Lady Yellow", "Dr. Green", "Cheif Blue", "Mme. Purple", "Sir Pink"];

var gameSpeed = 2;

var stocks = [];
var stockID = 0;
addStock("SEFFCO", 50.00, 10, 4, "Mme. Purple");
addStock("DTVOGS", 50.00, 20, 2, "Prof. Orange");
addStock("JNVPLS", 50.00, 25, 0, "Cheif Blue");

io.on('connection', (socket) => {
    playersOnline++;
    console.log("Player joined")
    var player = [];
    player.push(playerID);
    player.push(socket);
    player.push(200);
    var ownedShares = [];
    player.push(ownedShares);
    players.push(player);
    socket.emit("setPlayerID", {
        id: playerID
    });
    playerID++;
    console.log("Player " + players[players.length-1][0] + " created");

    socket.emit("initialReloadStocks", {
        stockArray: stocks
    });
    socket.emit("setDay", {
        day: day
    })

    socket.on('getMoney', (data) => {
        var player = getPlayerFromID(data.id);
        socket.emit("setClientMoney", {
            money: player[2].toFixed(2)
        });
    });

    socket.on('disconnect', () => {
        console.log('Player left');
        for (var i; i < players.length; i++)
        {
            if (socket == players[i][0])
            {
                players.splice(i, 1)
            }
        }
        playersOnline--;
    });

    socket.on('buyShare', (data) => {
        var company = getCompanyFromID(data.companyID);
        var player = getPlayerFromID(data.playerID);

        if (player[2] < company[2])
        {
            socket.emit("invalidFunds");
            return;
        }
        if (company[3] == 0)
        {
            socket.emit("invalidInventory");
            return;
        }

        player[2] = player[2] - company[2];
        company[3]--;
        if (player[3].length == 0)
        {
            //[ID, AMOUNT]
            var share = [];
            share.push(company[0]);
            share.push(1);
            player[3].push(share);
        }
        else
        {
            var added = false;
            for (var i = 0; i < player[3].length; i++)
            {
                if (player[3][i][0] == company[0])
                {
                    player[3][i][1] = player[3][i][1] + 1;
                    added = true;
                }
            }
            if (!added)
            {
                var share = [];
                share.push(company[0]);
                share.push(1);
                player[3].push(share);
            }
        }
        console.log("Player " + player[0] + " bought a share of " + company[1] + " (" + company[3] + " remaining)");
        socket.emit('updateOwnedShares', {
            ownedShares: player[3]
        });
        refreshStocks();
    });

    socket.on('sellShare', (data) => {
        var company = getCompanyFromID(data.companyID);
        var player = getPlayerFromID(data.playerID);

        player[2] = player[2] + company[2];
        company[3]++;
        for (var i = 0; i < player[3].length; i++)
        {
            if (player[3][i][0] == company[0])
            {
                    player[3][i][1] = player[3][i][1] - 1;
            }
        }
        console.log("Player " + player[0] + " sold a share of " + company[1] + " (now " + company[3] + " available)");

        for (var i = 0; i < player[3].length; i++)
        {
            if (player[3][i][1] == 0)
            {
                player[3].splice(i, 1);
            }
        }
        socket.emit('updateOwnedShares', {
            ownedShares: player[3]
        });
        refreshStocks();
    });

    socket.on('setGameSpeed', (data) => {
        gameSpeed = data.speed;
    });

    socket.on('resetGame', () => {
        resetGame();
    });
});

server.listen(port, () => {
    console.log('Server is up on port ' + port);
});

function addStock(tag, value, shares, dividends, ceo)
{
    //company = [stockID, tag, value, shares, dividends, prevValues[], ]
    var company = [];
    company.push(stockID);
    stockID++;
    company.push(tag);
    company.push(value);
    company.push(shares);
    company.push(dividends);
    var prevValues = [];
    company.push(prevValues);
    company.push(ceo);

    stocks.push(company);
    console.log("\nCreated stock: " + tag + "\nWorth: $" + value + "\nShares: " + shares + "\nDividends: " + dividends + "%\n");
}

function nextDay()
{
    updateLeaderboard();
    checkNewCompany();
    earnDividends();
    updateStocks();
    //ADD ALL OF THE DAYS CHANGES HERE.
    refreshStocks()
    io.emit("setDay", {
        day: day
    })
    console.log("Day " + day + " passed")
    day++;
}

var dayCycle = setInterval(function() {
    nextDay();
}, gameSpeed*1000);

function getCompanyFromID(id)
{
    var arrayPosition;
    for (var i = 0; i < stocks.length; i++)
    {
        if (stocks[i][0] == id)
        {
            arrayPosition = i;
        }
    }
    return stocks[arrayPosition];
}

function getPlayerFromID(id)
{
    var arrayPosition;
    for (var i = 0; i < players.length; i++)
    {
        if (players[i][0] == id)
        {
            arrayPosition = i;
        }
    }
    return players[arrayPosition];
}

function refreshStocks()
{
    io.emit("reloadStocks", {
        stockArray: stocks
    });
}

function randNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function updateStocks()
{
    for (var i = 0; i < stocks.length; i++)
    {
        var company = getCompanyFromID(stocks[i][0])
        if (randNum(0, 1))
        {
            var num = randNum(0, 20)
            company[2]+= num;
            console.log(stocks[i][1] + " earnt $" + num);
            company[5].push(company[2]);
            /*if (company[5].length > 20)
            {
                company[5].splice(0, company[5].length-20);
            }*/
        }
        else
        {
            var num = randNum(0, 20)
            company[5].push(company[2]);
            company[2]-= num;
            console.log(stocks[i][1] + " lost $" + num);
            /*if (company[5].length > 20)
            {
                company[5].splice(0, company[5].length-20);
            }*/
            if (company[2] <= 0)
            {
                console.log(stocks[i][1] + " has gone bankrupt");
                stocks.splice(i, 1);
                for (var j = 0; j < players.length; j++)
                {
                    for (var k = 0; k < players[j][3].length; k++)
                    {
                        if (players[j][3][k][0] == company[0])
                        {
                            players[j][3].splice(k, 1);
                        }
                    }
                }
            }
        }
    }
    refreshStocks();
    players.forEach(player => {
        player[1].emit('updateOwnedShares', {
            ownedShares: player[3]
        });
    });
}

function earnDividends()
{
    players.forEach(player => {
        player[3].forEach(ownedStock => {
            var company = getCompanyFromID(ownedStock[0]);
            if (company[4] > 0)
            {
                var num = (company[2] * (0.01*company[4]))*ownedStock[1]
                num.toFixed(2);
                player[2]+= num;
                console.log(company[0] + " has given dividends to player " + player[0] + " and earnt them $" + num);
            }
        });
    });
}

function resetGame()
{
    //add everything to reset here
    stocks.splice(0);
    addStock("SEFFCO", 50.00, 10, 4, "Mme. Purple");
    addStock("DTVOGS", 50.00, 20, 2, "Prof. Orange");
    addStock("JNVPLS", 50.00, 25, 0, "Cheif Blue");

    players.forEach(player => {
        player[3].splice(0);
        player[2] = 200;
    });

    day = 1;
    refreshStocks();
}

function checkNewCompany()
{
    if (randNum(0, 1))
    {
        var consonant = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "V", "W", "X", "Y", "Z"];
        var vowel = ["A", "E", "I", "O", "U"];
        if (randNum(0, 1))
        {
            var tag = consonant[randNum(0, 20)]+vowel[randNum(0, 4)]+consonant[randNum(0, 20)]+vowel[randNum(0, 4)]+consonant[randNum(0, 20)]+vowel[randNum(0, 4)];
        }
        else
        {
            var tag = vowel[randNum(0, 4)]+consonant[randNum(0, 20)]+vowel[randNum(0, 4)]+consonant[randNum(0, 20)]+vowel[randNum(0, 4)]+consonant[randNum(0, 20)];
        }
        
        var shares = randNum(5, 50);
        addStock(tag, 50, shares, randNum(0, Math.floor(50/shares)), businessOwners[randNum(0,businessOwners.length-1)]);
    }
}

function updateLeaderboard()
{
    leaderBoard = [];
    players.forEach(player => {
        var playerStat = [player[0], player[2].toFixed(2)];
        leaderBoard.push(playerStat);
    });
    io.emit("updateLeaderboard", {
        leaderBoard: leaderBoard
    })
}