const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { promisify } = require('util');
const { Client } = require('pg');

const dotenv = require("dotenv");
dotenv.config({path : './.env'});

const conString = process.env.CONNECTION_STRING;

const client = new Client({
    connectionString: conString,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect().then(() => console.log("connected to postgreSQL")).catch(err => console.log(err));

exports.register = (req, res) => {
    const { name, email, password, passConfirm } = req.body;
    const query = {
        name: 'fetch-user',
        text: 'SELECT email FROM users WHERE email = $1',
        values: [email]
    };
    client
        .query(query)
        .then(async (result) => {
            if (result.rows.length > 0) return res.render('register', { message: 'Cet email est déjà utilisé! ' });
            else if (password !== passConfirm) return res.render('register', { message: ' Les mot de passes ne correspondent pas! ' });
            let hashedPassword = await bcrypt.hash(password, 8);
            const insertQuery = {
                text: 'INSERT INTO users(name, email, password) VALUES($1, $2, $3)',
                values: [name, email, hashedPassword]
            }
            client.query(insertQuery)
                .then(() => {
                    res.render("login", { message: "Vous êtes bien enregistré, vous pouvez vous connecter" });
                })
                .catch(err => console.log(err));

        })
        .catch(e => console.error(e.stack))

}


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).render('login', { message: 'Entrez un email et mot de passe valide ' })

        const selectQuery = {
            text: 'SELECT * FROM users WHERE email = $1',
            values: [email]
        };

        client.query(selectQuery)
            .then(async (result) => {
                console.log(result.rows[0])
                if (!result.rows[0] || !(await bcrypt.compare(password, result.rows[0].password))) return res.status(401).render('login', {
                    message: "Email ou mot de passe incorrect!"
                });
                else {
                    const id = result.rows[0].id;
                    const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
                        expiresIn: process.env.JWT_EXPIRES_IN
                    });

                    const cookieOptions = {
                        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
                        httpOnly: true
                    };
                    res.cookie("jwt", token, cookieOptions);
                    res.status(200).redirect("/");

                }


            })
            .catch(err => console.log(err));
    }
    catch (error) {
        console.log(error);
    }
}


exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

            const query = {
                text: 'SELECT * FROM users WHERE id = $1',
                values: [decoded.id]
            };

            client.query(query)
                .then(result => {
                    if (!result) return next();
                    req.user = result.rows[0];
                    return next();
                });

        } catch (error) {
            console.log(error);
            next();
        }
    }
    else {
        next();
    }
}

exports.logout = (req, res) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });
    res.status(200).redirect('/');
}