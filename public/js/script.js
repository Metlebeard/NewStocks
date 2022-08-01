let socket = io();

var stocks = [];
var ownedStocks = [];
var money;
var playerID;
var selectedCompany = 0;

var leaderBoard = [];

loadBaseScreen();
loadGameScreen();

socket.on('connect', function() {
    console.log('Connected to server');
});

//log if disconnected from server..
socket.on('disconnect', function() {
    console.log('Disconnected from server');
});

socket.on('initialReloadStocks', function(data) {
    data.stockArray.forEach(company => {
        stocks.push(company);
    });
    var stockMarketList = document.getElementById("stockMarketList");
    while (stockMarketList.firstChild)
    {
        stockMarketList.removeChild(stockMarketList.lastChild);
    }
    stocks.forEach(company => {
        var companyButton = document.createElement("button");
        companyButton.textContent = company[1];
        companyButton.setAttribute("onClick", "openCompany(" + company[0] + ")");
        companyButton.classList.add("companyButton");
        stockMarketList.appendChild(companyButton);
    });
    openCompany(stocks[0][0]);
    socket.emit("getMoney", {
        id: playerID
    });
});

socket.on('reloadStocks', function(data) {
    stocks.splice(0);
    data.stockArray.forEach(company => {
        stocks.push(company);
    });
    stocks.sort(function(a, b) {return b[2]-a[2]});
    var stockMarketList = document.getElementById("stockMarketList");
    while (stockMarketList.firstChild)
    {
        stockMarketList.removeChild(stockMarketList.lastChild);
    }
    
    stocks.forEach(company => {
        var companyButton = document.createElement("button");
        companyButton.textContent = company[1];
        companyButton.setAttribute("onClick", "openCompany(" + company[0] + ")");
        companyButton.classList.add("companyButton");
        stockMarketList.appendChild(companyButton);
    });
    openCompany(selectedCompany);
});

socket.on('setClientMoney', function(data) {
    money = data.money;
    balanceText = document.getElementById("balanceText");
    balanceText.textContent = "Money: $" + money;
});

socket.on('setPlayerID', function(data) {
    playerID = data.id;
    playerTitle = document.getElementById("playerTitle");
    playerTitle.textContent = "You (Player " + playerID + ")";
});

socket.on('setDay', function(data) {
    document.getElementById("dayCounter").textContent = "Day " + data.day;
});

socket.on('updateOwnedShares', function(data) {
    ownedStocks = data.ownedShares;
    socket.emit('getMoney', {
        id: playerID
    });

    ownedList = document.getElementById("ownedList");
    ownedStocks.sort(function(a, b) {return b[1]-a[1]});

    while (ownedList.firstChild)
    {
        ownedList.removeChild(ownedList.lastChild);
    }

    ownedStocks.forEach(ownedCompany => {
        var company = getCompanyFromID(ownedCompany[0]);
        var container = document.createElement("div");
        var text = document.createElement("button");
        text.textContent = company[1] + ": " + ownedCompany[1];
        text.setAttribute("onClick", "openCompany(" + company[0] + ")");
        text.classList.add("ownedList");
        container.appendChild(text);
        var button = document.createElement("button");
        button.textContent = "Sell";
        button.classList.add("ownedList");
        button.setAttribute("onClick", "sellShare(" + company[0] + ")");
        container.appendChild(button);
        ownedList.appendChild(container);
    });
});

function loadBaseScreen()
{
    //create container
    var container = document.createElement("div");
    container.classList.add("container");
    container.setAttribute("id", "container");
    document.body.appendChild(container);

    //create day counter
    var dayCounter = document.createElement("h3");
    dayCounter.textContent = "Day 1";
    dayCounter.setAttribute("id", "dayCounter");
    container.appendChild(dayCounter);

    //create nav menu here
    var navBar = document.createElement("nav");
    navBar.classList.add("navBar");
    container.appendChild(navBar);

    var stockMarketButton = document.createElement("button");
    stockMarketButton.textContent = "Stock Market";
    navBar.appendChild(stockMarketButton);

    var bankButton = document.createElement("button");
    bankButton.textContent = "Bank";
    navBar.appendChild(bankButton);

    var businessButton = document.createElement("button");
    businessButton.textContent = "Business";
    navBar.appendChild(businessButton);

    //create gameContainer
    var gameContainer = document.createElement("div");
    gameContainer.classList.add("gameContainer");
    gameContainer.setAttribute("id", "gameContainer");
    container.appendChild(gameContainer);

    //create game settings
    var gameSettings = document.createElement("div");
    gameSettings.classList.add("gameSettings");
    gameSettings.setAttribute("id", "gameSettings");
    document.body.appendChild(gameSettings);

    var settingsTitle = document.createElement("h2");
    settingsTitle.textContent = "Game Settings";
    gameSettings.appendChild(settingsTitle);

    var speedInput = document.createElement("input");
    speedInput.setAttribute("id", "speedInput");
    speedInput.setAttribute("placeholder", "Sec/Day (Default: 2)");
    gameSettings.appendChild(speedInput);

    var speedButton = document.createElement("button");
    speedButton.textContent ="Set Speed";
    speedButton.setAttribute("onClick", "setGameSpeed()");
    gameSettings.appendChild(speedButton);

    gameSettings.appendChild(document.createElement("br"));
    gameSettings.appendChild(document.createElement("br"));

    var resetButton = document.createElement("button");
    resetButton.textContent ="Reset Game";
    resetButton.setAttribute("onClick", "resetGame()");
    gameSettings.appendChild(resetButton);

    var leaderBoardTitle = document.createElement("h2");
    leaderBoardTitle.textContent = "Leaderboard"
    gameSettings.appendChild(leaderBoardTitle);

    var leaderBoard = document.createElement("div");
    leaderBoard.classList.add("leaderBoard");
    leaderBoard.setAttribute("id", "leaderBoard");
    gameSettings.appendChild(leaderBoard);
}

function loadGameScreen()
{
    var gameContainer = document.getElementById("gameContainer");
    //create stocks tab
    var stockTab = document.createElement("div");
    stockTab.classList.add("stockTab");
    stockTab.setAttribute("id", "stockTab");
    gameContainer.appendChild(stockTab);

    //add stock market to stocks tab
    var stockMarket = document.createElement("div");
    stockMarket.classList.add("stockMarket");
    stockMarket.setAttribute("id", "stockMarket");
    stockTab.appendChild(stockMarket);

    var stockMarketTitle = document.createElement("h1");
    stockMarketTitle.textContent = "Stock Market";
    stockMarket.appendChild(stockMarketTitle);

    var stockMarketList = document.createElement("div");
    stockMarketList.classList.add("stockMarketList");
    stockMarketList.setAttribute("id", "stockMarketList");
    stockMarket.appendChild(stockMarketList);

    //add graph container to stocks tab
    var graphContainer = document.createElement("div");
    graphContainer.classList.add("graphContainer");
    graphContainer.setAttribute("id", "graphContainer");
    stockTab.appendChild(graphContainer);

    var graphCanvas = document.createElement("canvas");
    graphCanvas.setAttribute("height", "500");
    graphCanvas.setAttribute("width", "500");
    graphCanvas.setAttribute("id", "graphCanvas");
    graphContainer.appendChild(graphCanvas);

    //add options container to stocks tab
    var optionsContainer = document.createElement("div");
    optionsContainer.classList.add("optionsContainer");
    optionsContainer.setAttribute("id", "optionsContainer");
    stockTab.appendChild(optionsContainer);

    var stockName = document.createElement("h2");
    stockName.textContent = "Name: ??????";
    stockName.setAttribute("id", "stockName");
    optionsContainer.appendChild(stockName);

    var stockCEO = document.createElement("p");
    stockCEO.textContent = "CEO: ??????";
    stockCEO.setAttribute("id", "stockCEO");
    optionsContainer.appendChild(stockCEO);

    var stockValue = document.createElement("p");
    stockValue.textContent = "Current Value: $??.??";
    stockValue.setAttribute("id", "stockValue");
    optionsContainer.appendChild(stockValue);

    var stockQuantity = document.createElement("p");
    stockQuantity.textContent = "Shares Left: ??";
    stockQuantity.setAttribute("id", "stockQuantity");
    optionsContainer.appendChild(stockQuantity);

    var stockDividends = document.createElement("p");
    stockDividends.textContent = "Dividends: ??%";
    stockDividends.setAttribute("id", "stockDividends");
    optionsContainer.appendChild(stockDividends);

    var stockBuyButton = document.createElement("button");
    stockBuyButton.textContent = "Buy Share";
    stockBuyButton.setAttribute("id", "stockBuyButton");
    optionsContainer.appendChild(stockBuyButton);

    var playerTitle = document.createElement("h2");
    playerTitle.textContent = "You (Player ????)";
    playerTitle.setAttribute("id", "playerTitle");
    optionsContainer.appendChild(playerTitle);

    var balanceText = document.createElement("p");
    balanceText.textContent = "Money: $200";
    balanceText.setAttribute("id", "balanceText");
    optionsContainer.appendChild(balanceText);

    var sharesTitle = document.createElement("p");
    sharesTitle.textContent = "Owned Shares: \n";
    optionsContainer.appendChild(sharesTitle);

    var ownedList = document.createElement("div");
    ownedList.classList.add("ownedList");
    ownedList.setAttribute("id", "ownedList");
    optionsContainer.appendChild(ownedList);

    var gameSettings = document.getElementById("gameSettings");
    gameContainer.appendChild(gameSettings);
}

function openCompany(companyID)
{
    var company = getCompanyFromID(companyID);
    selectedCompany = companyID;

    var stockName = document.getElementById("stockName");
    var stockCEO = document.getElementById("stockCEO");
    var stockValue = document.getElementById("stockValue");
    var stockQuantity = document.getElementById("stockQuantity");
    var stockDividends = document.getElementById("stockDividends");
    var stockBuyButton = document.getElementById("stockBuyButton");

    stockName.textContent = "Name: " + company[1];
    stockValue.textContent = "Current Value: $" + company[2];
    stockQuantity.textContent = "Shares Left: " + company[3];
    stockDividends.textContent = "Dividends: " + company[4] + "%";
    stockBuyButton.setAttribute("onClick", "buyShare(" + companyID + ")");
    stockCEO.textContent = "CEO: " + company[6];
    drawGraph(companyID);
}

function buyShare(companyID)
{
    var company = getCompanyFromID(companyID);
    if (money >= company[2])
    {
        if (company[3] > 0)
        {
            socket.emit("buyShare", {
                playerID: playerID,
                companyID: companyID
            });
        }
        else
        {
            alert("No shares left!")
        }
    }
    else
    {
        alert("Not enough money!");
    }

}

socket.on('invalidFunds', function() {
    alert("Not enough money!");
});

socket.on('invalidInventory', function() {
    alert("No shares left!");
});

function sellShare(companyID)
{
    var company = getCompanyFromID(companyID);
    socket.emit("sellShare", {
        playerID: playerID,
        companyID: companyID
    })
}

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

function setGameSpeed()
{
    var speedInput = document.getElementById("speedInput");
    socket.emit("setGameSpeed", {
        speed: speedInput.textContent
    });
}

function resetGame()
{
    socket.emit("resetGame");
    
}

socket.on('updateLeaderboard', function(data) {
    var leaderBoard = document.getElementById("leaderBoard");
    while (leaderBoard.firstChild)
    {
        leaderBoard.removeChild(leaderBoard.lastChild);
    }
    leaderBoardArray = data.leaderBoard;
    leaderBoardArray.sort(function(a, b) {return b[1]-a[1]});
    leaderBoardArray.forEach(player => {
        var playerTab = document.createElement("p");
        playerTab.textContent = "Player " + player[0] + ": $" + player[1];
        leaderBoard.appendChild(playerTab);
    }); 
});

//company[ID, TAG, VALUE, SHARES, DIVIDENDS, PREVVALUES[], CEO]

function drawGraph(companyID)
{
    var company = getCompanyFromID(companyID);

    var c = document.getElementById('graphCanvas');
    var ctx = c.getContext("2d");

    clearGraph();

    var w = c.width;
    c.width = 1;
    c.width = w;

    for (var i = 1; i < company[5].length; i++)
    {
        
        var text = "";
        if (company[5][i] > company[5][i-1])
        {
            ctx.strokeStyle = "#3CAEA3";
            text = "+" + (Number(company[5][i]) - Number(company[5][i-1]).toString());
        }
        else if (company[5][i] === company[5][i-1])
        {
            ctx.strokeStyle = "#F6D55C";
            text = "+0";
        }
        else
        {
            ctx.strokeStyle = "#ED553B";
            text = "-" + (Number(company[5][i-1]) - Number(company[5][i]).toString());
        }
        ctx.lineWidth = 2 //5;
        ctx.beginPath();

        ctx.moveTo((i-1) *5/* *25*/ , c.height - company[5][i-1] / 2);
        ctx.lineTo(i*5/* *25*/, c.height - company[5][i] / 2);
        ctx.stroke();
        

        /*ctx.font = "15px Georgia";
        ctx.fillStyle = "#173F5F";*/
        /*ctx.fillText(text, (i *25) - 5, (c.height - company[5][i] / 3) - 10);*/
    }
    ctx.font = "30px Georgia";
    ctx.fillStyle = "#173F5F";
    ctx.fillText(company[1], 0, 30);
}

function clearGraph()
{
    var c = document.getElementById("graphCanvas");
    var ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);
    var w = c.width;
    c.width = 1;
    c.width = w;
}

/* graphing functions from other game
function drawGraph(id)
{
    var button = document.getElementById(id);
    var business;
    for (var i = 0; i < businesses.length; i++)
    {
        if (businesses[i][0] === button.textContent)
        {
            business = businesses[i];
        }
    }
    var c = document.getElementById("graph");
    var ctx = c.getContext("2d");

    clearGraph();
    var w = c.width;
    c.width = 1;
    c.width = w;

    for (var i = 1; i < business[1].length+1; i++)
    {
        var text = "";
        if (business[1][i] > business[1][i-1])
        {
            ctx.strokeStyle = "#3CAEA3";
            ctx.lineWidth = 5;
            text = "+" + (Number(business[1][i]) - Number(business[1][i-1]).toString());
        }
        else if (business[1][i] === business[1][i-1])
        {
            ctx.strokeStyle = "#F6D55C";
            ctx.lineWidth = 5;
            text = "+0";
        }
        else
        {
            ctx.strokeStyle = "#ED553B";
            ctx.lineWidth = 5;
            text = "-" + (Number(business[1][i-1]) - Number(business[1][i]).toString());
        }
        ctx.beginPath();
        //ctx.line((i-1) * 10, c.height - business[1][i-1] / 3, i*10, c.height - business[1][i] / 3);

        ctx.moveTo((i-1) * 30 , c.height - business[1][i-1] / 3);
        ctx.lineTo(i*30, c.height - business[1][i] / 3);
        ctx.stroke();

        

        ctx.font = "15px Georgia";
        ctx.fillStyle = "#173F5F";
        //ctx.fillStyle = "#20639B";
        ctx.fillText(text, (i*30) - 5, (c.height - business[1][i] / 3) - 10);
    }
    ctx.font = "30px Georgia";
    ctx.fillStyle = "#173F5F";
    ctx.fillText(business[0], 0, 30);
}

function clearGraph()
{
    var c = document.getElementById("graph");
    var ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);
    var w = c.width;
    c.width = 1;
    c.width = w;
}
*/