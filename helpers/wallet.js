const WalletTransaction = require('../models/WalletTransaction.js');
const User = require('../models/User');

exports.logWalletTransaction = async ({ userId, amount, type, reason, description = '' }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const transaction = new WalletTransaction({
    user_id: userId,
    amount,
    type,
    reason,
    description,
    balance_after: user.wallet_balance
  });

  await transaction.save();
};
