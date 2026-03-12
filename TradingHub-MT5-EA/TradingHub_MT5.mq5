//+------------------------------------------------------------------+
//|                                            TradingHub_MT5.mq5    |
//|                                  TradingHub Signal Copier        |
//|                                  https://tradinghub.com          |
//+------------------------------------------------------------------+
#property copyright "TradingHub © 2025"
#property link      "https://tradinghub.com"
#property version   "1.00"
#property strict

//--- Input Parameters
input string    ApiKey = "";                    // TradingHub API Key
input double    RiskPercent = 1.0;              // Risk per trade (%)
input double    MaxLotSize = 10.0;              // Maximum lot size
input double    MinLotSize = 0.01;              // Minimum lot size
input int       MaxTradesPerDay = 20;           // Maximum trades per day
input int       MaxOpenTrades = 5;              // Maximum concurrent trades
input int       SlippagePoints = 30;            // Slippage in points
input int       MagicNumber = 88888;            // Magic number
input bool      EnableTrailingStop = true;      // Enable trailing stop
input double    TrailingStopDistance = 50.0;    // Trailing stop distance (pips)
input double    TrailingStopStep = 10.0;        // Trailing stop step (pips)
input bool      EnableNewsFilter = false;       // Enable news filter
input int       PollingIntervalSeconds = 10;    // Check for signals every N seconds
input bool      ShowInfoPanel = true;           // Show information panel
input color     PanelTextColor = clrWhite;      // Panel text color
input color     PanelBgColor = clrNavy;         // Panel background color

//--- Global Variables
string          ServerUrl = "https://api.tradinghub.com";
datetime        LastCheckTime = 0;
int             TradesToday = 0;
datetime        LastResetDate = 0;
string          LastError = "";
int             TotalSignalsReceived = 0;
int             TotalTradesExecuted = 0;
int             TotalTradesFailed = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    // Validate API key
    if(StringLen(ApiKey) < 10)
    {
        Alert("ERROR: Please set your TradingHub API Key in EA settings!");
        return INIT_FAILED;
    }
    
    // Validate inputs
    if(RiskPercent <= 0 || RiskPercent > 10)
    {
        Alert("ERROR: Risk percent must be between 0 and 10%");
        return INIT_FAILED;
    }
    
    // Set timer for periodic signal checking
    EventSetTimer(PollingIntervalSeconds);
    
    // Print startup info
    Print("========================================");
    Print("TradingHub MT5 EA Started");
    Print("API Key: ", StringSubstr(ApiKey, 0, 10), "...");
    Print("Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    Print("Risk: ", RiskPercent, "%");
    Print("Polling: Every ", PollingIntervalSeconds, " seconds");
    Print("========================================");
    
    // Verify connection to server
    if(!VerifyConnection())
    {
        Alert("WARNING: Could not connect to TradingHub server. Will retry...");
    }
    else
    {
        Print("✓ Connected to TradingHub server");
    }
    
    // Initialize daily counter
    LastResetDate = TimeCurrent();
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
    
    Print("========================================");
    Print("TradingHub MT5 EA Stopped");
    Print("Total Signals: ", TotalSignalsReceived);
    Print("Total Executed: ", TotalTradesExecuted);
    Print("Total Failed: ", TotalTradesFailed);
    Print("========================================");
}

//+------------------------------------------------------------------+
//| Timer function - checks for new signals                          |
//+------------------------------------------------------------------+
void OnTimer()
{
    // Reset daily trade counter at midnight
    datetime currentTime = TimeCurrent();
    if(TimeDay(currentTime) != TimeDay(LastResetDate))
    {
        TradesToday = 0;
        LastResetDate = currentTime;
        Print("Daily trade counter reset");
    }
    
    // Check if we can trade more today
    if(TradesToday >= MaxTradesPerDay)
    {
        LastError = "Max trades per day reached";
        return;
    }
    
    // Check for new signals
    CheckForSignals();
}

//+------------------------------------------------------------------+
//| Tick function - manages open positions                           |
//+------------------------------------------------------------------+
void OnTick()
{
    // Update trailing stops
    if(EnableTrailingStop)
    {
        ManageTrailingStops();
    }
    
    // Draw info panel
    if(ShowInfoPanel)
    {
        DrawInfoPanel();
    }
}

//+------------------------------------------------------------------+
//| Verify connection to TradingHub server                           |
//+------------------------------------------------------------------+
bool VerifyConnection()
{
    string url = ServerUrl + "/api/ea/verify";
    string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + ApiKey + "\r\n";
    string requestBody = "{\"api_key\":\"" + ApiKey + "\"}";
    
    char post[], result[];
    string resultHeaders;
    
    StringToCharArray(requestBody, post, 0, StringLen(requestBody));
    
    int res = WebRequest(
        "POST",
        url,
        headers,
        5000,  // timeout
        post,
        result,
        resultHeaders
    );
    
    if(res == 200)
    {
        string response = CharArrayToString(result);
        // Parse JSON response (simplified)
        if(StringFind(response, "\"success\":true") >= 0)
        {
            return true;
        }
    }
    
    LastError = "Connection verification failed: " + IntegerToString(res);
    return false;
}

//+------------------------------------------------------------------+
//| Check for new signals from server                                |
//+------------------------------------------------------------------+
void CheckForSignals()
{
    string url = ServerUrl + "/api/ea/signals";
    string headers = "Authorization: Bearer " + ApiKey + "\r\n";
    
    char result[];
    string resultHeaders;
    
    int res = WebRequest(
        "GET",
        url,
        headers,
        5000,
        NULL,
        result,
        resultHeaders
    );
    
    if(res == 200)
    {
        string response = CharArrayToString(result);
        
        // Parse and process signals
        ProcessSignals(response);
        
        LastError = "";
    }
    else
    {
        LastError = "Failed to fetch signals: " + IntegerToString(res);
        if(res == -1)
        {
            LastError = "WebRequest error. Check: Tools -> Options -> Expert Advisors -> Allow WebRequest for: " + ServerUrl;
            Print(LastError);
        }
    }
}

//+------------------------------------------------------------------+
//| Process signals from server response                             |
//+------------------------------------------------------------------+
void ProcessSignals(string jsonResponse)
{
    // Simple JSON parsing (you can use a JSON library for production)
    // Expected format: [{"id":"123","symbol":"EURUSD","type":"BUY","entry":1.1000,"sl":1.0950,"tp":1.1100}]
    
    if(StringFind(jsonResponse, "[]") >= 0)
    {
        // No signals
        return;
    }
    
    // Count signals in response
    int signalCount = 0;
    int pos = 0;
    while((pos = StringFind(jsonResponse, "\"id\":", pos)) >= 0)
    {
        signalCount++;
        pos++;
    }
    
    if(signalCount == 0) return;
    
    Print("Received ", signalCount, " new signal(s)");
    TotalSignalsReceived += signalCount;
    
    // Parse each signal (simplified - use proper JSON parser in production)
    int startPos = 0;
    for(int i = 0; i < signalCount; i++)
    {
        SignalData signal;
        
        // Extract signal data (simplified parsing)
        if(ParseSignal(jsonResponse, startPos, signal))
        {
            // Execute signal
            ExecuteSignal(signal);
            startPos += 100; // Move to next signal
        }
    }
}

//+------------------------------------------------------------------+
//| Signal data structure                                            |
//+------------------------------------------------------------------+
struct SignalData
{
    string id;
    string symbol;
    string type;      // "BUY" or "SELL"
    double entry;
    double sl;
    double tp;
};

//+------------------------------------------------------------------+
//| Parse signal from JSON (simplified)                              |
//+------------------------------------------------------------------+
bool ParseSignal(string json, int startPos, SignalData &signal)
{
    // This is a simplified parser
    // For production, use a proper JSON parsing library
    
    int idPos = StringFind(json, "\"id\":\"", startPos);
    if(idPos < 0) return false;
    
    int idEnd = StringFind(json, "\"", idPos + 6);
    signal.id = StringSubstr(json, idPos + 6, idEnd - idPos - 6);
    
    int symbolPos = StringFind(json, "\"symbol\":\"", startPos);
    int symbolEnd = StringFind(json, "\"", symbolPos + 10);
    signal.symbol = StringSubstr(json, symbolPos + 10, symbolEnd - symbolPos - 10);
    
    int typePos = StringFind(json, "\"type\":\"", startPos);
    int typeEnd = StringFind(json, "\"", typePos + 8);
    signal.type = StringSubstr(json, typePos + 8, typeEnd - typePos - 8);
    
    int entryPos = StringFind(json, "\"entry\":", startPos);
    string entryStr = StringSubstr(json, entryPos + 8, 20);
    signal.entry = StringToDouble(entryStr);
    
    int slPos = StringFind(json, "\"sl\":", startPos);
    string slStr = StringSubstr(json, slPos + 5, 20);
    signal.sl = StringToDouble(slStr);
    
    int tpPos = StringFind(json, "\"tp\":", startPos);
    string tpStr = StringSubstr(json, tpPos + 5, 20);
    signal.tp = StringToDouble(tpStr);
    
    return true;
}

//+------------------------------------------------------------------+
//| Execute trading signal                                           |
//+------------------------------------------------------------------+
void ExecuteSignal(SignalData &signal)
{
    Print("Executing signal: ", signal.symbol, " ", signal.type, " @ ", signal.entry);
    
    // Check if symbol exists and is tradeable
    if(!SymbolInfoInteger(signal.symbol, SYMBOL_TRADE_MODE))
    {
        Print("ERROR: Symbol ", signal.symbol, " is not tradeable");
        ReportExecution(signal.id, 0, false, "Symbol not tradeable");
        TotalTradesFailed++;
        return;
    }
    
    // Check max open trades
    int openTrades = CountOpenTrades();
    if(openTrades >= MaxOpenTrades)
    {
        Print("ERROR: Maximum open trades reached (", MaxOpenTrades, ")");
        ReportExecution(signal.id, 0, false, "Max open trades reached");
        TotalTradesFailed++;
        return;
    }
    
    // Calculate lot size based on risk
    double lotSize = CalculateLotSize(signal.symbol, signal.entry, signal.sl, RiskPercent);
    
    // Validate lot size
    double minLot = SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_MIN);
    double maxLot = SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_MAX);
    double lotStep = SymbolInfoDouble(signal.symbol, SYMBOL_VOLUME_STEP);
    
    if(lotSize < MinLotSize) lotSize = MinLotSize;
    if(lotSize > MaxLotSize) lotSize = MaxLotSize;
    if(lotSize < minLot) lotSize = minLot;
    if(lotSize > maxLot) lotSize = maxLot;
    
    // Normalize lot size to step
    lotSize = MathFloor(lotSize / lotStep) * lotStep;
    
    Print("Calculated lot size: ", lotSize);
    
    // Prepare order request
    MqlTradeRequest request = {};
    MqlTradeResult result = {};
    
    request.action = TRADE_ACTION_DEAL;
    request.symbol = signal.symbol;
    request.volume = lotSize;
    request.type = (signal.type == "BUY") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
    request.price = (signal.type == "BUY") ? 
                     SymbolInfoDouble(signal.symbol, SYMBOL_ASK) : 
                     SymbolInfoDouble(signal.symbol, SYMBOL_BID);
    request.sl = signal.sl;
    request.tp = signal.tp;
    request.deviation = SlippagePoints;
    request.magic = MagicNumber;
    request.comment = "TH:" + signal.id;
    request.type_filling = ORDER_FILLING_FOK;
    
    // Send order
    if(OrderSend(request, result))
    {
        if(result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED)
        {
            Print("✓ Trade executed successfully! Ticket: ", result.order);
            TradesToday++;
            TotalTradesExecuted++;
            
            // Report success to server
            ReportExecution(signal.id, result.order, true, "");
        }
        else
        {
            Print("✗ Trade failed with code: ", result.retcode);
            TotalTradesFailed++;
            ReportExecution(signal.id, 0, false, "RetCode: " + IntegerToString(result.retcode));
        }
    }
    else
    {
        Print("✗ OrderSend failed with error: ", GetLastError());
        TotalTradesFailed++;
        ReportExecution(signal.id, 0, false, "Error: " + IntegerToString(GetLastError()));
    }
}

//+------------------------------------------------------------------+
//| Calculate lot size based on risk percentage                      |
//+------------------------------------------------------------------+
double CalculateLotSize(string symbol, double entry, double sl, double riskPercent)
{
    double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
    double riskAmount = accountBalance * (riskPercent / 100.0);
    
    double pointValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
    double pointSize = SymbolInfoDouble(symbol, SYMBOL_POINT);
    
    double slDistance = MathAbs(entry - sl);
    double slPoints = slDistance / pointSize;
    
    double lotSize = riskAmount / (slPoints * pointValue);
    
    return lotSize;
}

//+------------------------------------------------------------------+
//| Count currently open trades                                      |
//+------------------------------------------------------------------+
int CountOpenTrades()
{
    int count = 0;
    
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(PositionSelectByTicket(PositionGetTicket(i)))
        {
            if(PositionGetInteger(POSITION_MAGIC) == MagicNumber)
            {
                count++;
            }
        }
    }
    
    return count;
}

//+------------------------------------------------------------------+
//| Report execution to server                                       |
//+------------------------------------------------------------------+
void ReportExecution(string signalId, ulong ticket, bool success, string error)
{
    string url = ServerUrl + "/api/ea/report";
    string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + ApiKey + "\r\n";
    
    string requestBody = "{";
    requestBody += "\"signal_id\":\"" + signalId + "\",";
    requestBody += "\"ticket\":" + IntegerToString(ticket) + ",";
    requestBody += "\"success\":" + (success ? "true" : "false") + ",";
    requestBody += "\"error\":\"" + error + "\",";
    requestBody += "\"api_key\":\"" + ApiKey + "\"";
    requestBody += "}";
    
    char post[], result[];
    string resultHeaders;
    
    StringToCharArray(requestBody, post, 0, StringLen(requestBody));
    
    WebRequest(
        "POST",
        url,
        headers,
        5000,
        post,
        result,
        resultHeaders
    );
}

//+------------------------------------------------------------------+
//| Manage trailing stops for open positions                         |
//+------------------------------------------------------------------+
void ManageTrailingStops()
{
    double trailingDistance = TrailingStopDistance * SymbolInfoDouble(_Symbol, SYMBOL_POINT) * 10;
    double trailingStep = TrailingStopStep * SymbolInfoDouble(_Symbol, SYMBOL_POINT) * 10;
    
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(PositionSelectByTicket(PositionGetTicket(i)))
        {
            if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
            
            string symbol = PositionGetString(POSITION_SYMBOL);
            long type = PositionGetInteger(POSITION_TYPE);
            double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
            double currentSL = PositionGetDouble(POSITION_SL);
            
            double currentPrice = (type == POSITION_TYPE_BUY) ? 
                                   SymbolInfoDouble(symbol, SYMBOL_BID) : 
                                   SymbolInfoDouble(symbol, SYMBOL_ASK);
            
            double newSL = 0;
            bool modify = false;
            
            if(type == POSITION_TYPE_BUY)
            {
                newSL = currentPrice - trailingDistance;
                if(newSL > currentSL + trailingStep && newSL > openPrice)
                {
                    modify = true;
                }
            }
            else // SELL
            {
                newSL = currentPrice + trailingDistance;
                if((newSL < currentSL - trailingStep || currentSL == 0) && newSL < openPrice)
                {
                    modify = true;
                }
            }
            
            if(modify)
            {
                MqlTradeRequest request = {};
                MqlTradeResult result = {};
                
                request.action = TRADE_ACTION_SLTP;
                request.symbol = symbol;
                request.sl = newSL;
                request.tp = PositionGetDouble(POSITION_TP);
                request.position = PositionGetInteger(POSITION_TICKET);
                
                if(OrderSend(request, result))
                {
                    Print("Trailing stop updated for ", symbol, " to ", newSL);
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Draw information panel on chart                                  |
//+------------------------------------------------------------------+
void DrawInfoPanel()
{
    string panelName = "TradingHubPanel";
    int x = 10, y = 20, lineHeight = 18;
    
    // Create background
    if(ObjectFind(0, panelName + "_BG") < 0)
    {
        ObjectCreate(0, panelName + "_BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
        ObjectSetInteger(0, panelName + "_BG", OBJPROP_XDISTANCE, x);
        ObjectSetInteger(0, panelName + "_BG", OBJPROP_YDISTANCE, y);
        ObjectSetInteger(0, panelName + "_BG", OBJPROP_XSIZE, 250);
        ObjectSetInteger(0, panelName + "_BG", OBJPROP_YSIZE, 150);
        ObjectSetInteger(0, panelName + "_BG", OBJPROP_BGCOLOR, PanelBgColor);
        ObjectSetInteger(0, panelName + "_BG", OBJPROP_BORDER_TYPE, BORDER_FLAT);
        ObjectSetInteger(0, panelName + "_BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);
    }
    
    // Draw text labels
    string labels[] = {
        "TradingHub MT5 EA",
        "Status: " + (LastError == "" ? "Connected ✓" : "Error"),
        "Signals: " + IntegerToString(TotalSignalsReceived),
        "Executed: " + IntegerToString(TotalTradesExecuted),
        "Failed: " + IntegerToString(TotalTradesFailed),
        "Today: " + IntegerToString(TradesToday) + "/" + IntegerToString(MaxTradesPerDay),
        "Open: " + IntegerToString(CountOpenTrades()) + "/" + IntegerToString(MaxOpenTrades)
    };
    
    for(int i = 0; i < ArraySize(labels); i++)
    {
        string labelName = panelName + "_L" + IntegerToString(i);
        
        if(ObjectFind(0, labelName) < 0)
        {
            ObjectCreate(0, labelName, OBJ_LABEL, 0, 0, 0);
            ObjectSetInteger(0, labelName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
            ObjectSetInteger(0, labelName, OBJPROP_XDISTANCE, x + 10);
            ObjectSetInteger(0, labelName, OBJPROP_COLOR, PanelTextColor);
        }
        
        ObjectSetInteger(0, labelName, OBJPROP_YDISTANCE, y + 10 + (i * lineHeight));
        ObjectSetString(0, labelName, OBJPROP_TEXT, labels[i]);
    }
}

//+------------------------------------------------------------------+
