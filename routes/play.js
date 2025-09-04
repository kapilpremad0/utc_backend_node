const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Boot = require('../models/Boot');
const Room = require('../models/Room');


const playController = require('../controllers/playController');


// Helper: Format validation error
const formatError = (field, message) => ({ [field]: message });

const verifyToken = require('../middlewares/auth'); // 👈 Import middleware



router.post('/join-game',verifyToken ,playController.PlayBootGame);         // Get all
router.get('/boots',verifyToken ,playController.bootGameList);         // Get all
router.post('/exit-game', verifyToken, playController.exitGame);
router.post('/place-bet', verifyToken, playController.placeBet);
router.post('/complete-game', verifyToken, playController.completeGame);
router.get('/room-detail/:id', verifyToken, playController.roomDetail);

module.exports = router;
