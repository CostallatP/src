const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mailer = require('../../modules/mailer')


const authConfig = require('../../config/auth');

const User = require('../models/User');

const router = express.Router();

function generateToken(params ={}){
   return jwt.sign(params, authConfig.secret, {
        expiresIn: 86400,
    });
}


router.post('/register', async (req, res) => {
    const { email } = req.body;
    try {
        if (await User.findOne({ email }))
            return res.status(400).send({ error: 'O usuário ja existe!' });

        const user = await User.create(req.body);

        user.password = undefined;

        return res.send({ 
            user,
            token: generateToken({id: user.id}),
        });
    
    
    } catch (err) {
        return res.status(400).send({ error: 'Falha no registro' });
    }
});


router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;

    
    const user = await User.findOne({ email }).select('+password');

  
  
    if (!user)
        return res.status(400).send({ error: 'Usuário não encontrado' });
   
   
   
        if (!await bcrypt.compare(password, user.password))
        return res.status(400).send({ error: 'Senha invalida' });
   
   
        user.password = undefined;



    res.send({
         user,
         token: generateToken({id: user.id}),
        });
});


router.post('/forgot_password', async (req,res)=>{
const {email} = req.body;

try{
    const user = await User.findOne({email});
    if(!user)
    return res.status(400).send({ error: 'Usuário não encontrado' });
   
    const token = crypto.randomBytes(20).toString('hex');

    const now = new Date();
    now.setHours(now.getHours()+1);

    
await User.findByIdAndUpdate(user.id, {
'$set': {
passwordResetToken: token,
passwordResetExpires: now,
}
}, { new: true, useFindAndModify: false }
);




mailer.sendMail({
    to: email,
    from: 'miguel@teste.com',
    template: 'auth/forgot_password',
    context: {token},
}, (err) => {
    if (err)
   
    return res.status(400).send({ error: 'Não foi possivel relembrar a senha' });

    return res.status(400).send();

});
}catch(err){
    console.log(err);
    return res.status(400).send({ error: 'Erro: ao lembrar senha, tente novamente' });
}
});

router.post('/reset_password', async (req,res)=>{
    const {email, token, password} = req.body;

    try{
    const user = await User.findOne({email})
    .select('+passwordResetToken passwordResetExpires');
    
    if(!user)
    return res.status(400).send({ error: 'Usuário não encontrado' });
   
    if (token !== user.passwordResetToken)
    return res.status(400).send({error: 'token invalido'});

    const now = new Date();

    if (now > user.passwordResetExpires)
    return res.status(400).send({error: 'gere um novo token'});

    user.password = password;

    await user.save();
    
    res.send();

    } catch(err){
        return res.status(400).send({ error: 'Senha não resetada, tente novamente' });
   
    }
});

module.exports = app => app.use('/auth', router);