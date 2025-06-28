const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Estado simulado
let currentStation = null;
let isPlaying = false;

// APIs da Radio Browser
const API_URLS = [
    'https://all.api.radio-browser.info/json/stations/search',
    'https://de1.api.radio-browser.info/json/stations/search'
];

// Buscar estação por nome
async function searchStationByName(name) {
    for (let i = 0; i < API_URLS.length; i++) {
        try {
            const apiUrl = `${API_URLS[i]}?name=${encodeURIComponent(name)}&limit=5&hidebroken=true&order=clickcount&reverse=true`;
            
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'RadioPlayerApp/1.0',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) continue;
            
            const stations = await response.json();
            
            if (stations && stations.length > 0) {
                return stations[0];
            }
        } catch (error) {
            console.error(`API ${i + 1} falhou:`, error.message);
        }
    }
    return null;
}

// === APIS ALEXA ===

// Tocar rádio
app.post('/api/alexa/play', async (req, res) => {
    const { station_name } = req.body;
    
    if (!station_name) {
        return res.json({ 
            success: false, 
            message: 'Nome da estação é obrigatório' 
        });
    }

    try {
        const station = await searchStationByName(station_name);
        
        if (station) {
            currentStation = station;
            isPlaying = true;
            
            res.json({
                success: true,
                message: `Tocando ${station.name}`,
                station: {
                    name: station.name,
                    url: station.url_resolved,
                    country: station.country
                }
            });
        } else {
            res.json({
                success: false,
                message: `Não encontrei a rádio "${station_name}"`
            });
        }
    } catch (error) {
        res.json({
            success: false,
            message: 'Erro ao buscar rádio'
        });
    }
});

// Parar reprodução
app.post('/api/alexa/stop', (req, res) => {
    currentStation = null;
    isPlaying = false;
    
    res.json({
        success: true,
        message: 'Rádio parada'
    });
});

// Status atual
app.get('/api/alexa/status', (req, res) => {
    res.json({
        isPlaying,
        currentStation: currentStation ? {
            name: currentStation.name,
            country: currentStation.country,
            url: currentStation.url_resolved
        } : null,
        volume: 1.0
    });
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor Alexa funcionando',
        endpoints: ['/api/alexa/play', '/api/alexa/stop', '/api/alexa/status']
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🗣️ Servidor Alexa rodando na porta ${PORT}`);
    console.log(`🌐 APIs disponíveis em /api/alexa/*`);
});