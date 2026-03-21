const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 SERVIR ARQUIVOS
app.use(express.static(path.join(__dirname, "public")));

let clientes = [];
let usuarios = [];

/* ================= CARREGAR (PROTEGIDO) ================= */

try {
if (fs.existsSync(path.join(__dirname, "clientes.json"))) {
clientes = JSON.parse(fs.readFileSync(path.join(__dirname, "clientes.json")));
}
} catch (erro) {
console.log("Erro clientes.json:", erro);
clientes = [];
}

try {
if (fs.existsSync(path.join(__dirname, "usuarios.json"))) {
usuarios = JSON.parse(fs.readFileSync(path.join(__dirname, "usuarios.json")));
}
} catch (erro) {
console.log("Erro usuarios.json:", erro);
usuarios = [];
}

/* ================= ROTA PRINCIPAL ================= */
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ================= LOGIN ================= */

app.post("/login", (req, res) => {
const { usuario, senha } = req.body;

if (usuario === "admin" && senha === "123456") {
return res.json({ usuario: "admin", tipo: "admin" });
}

const user = usuarios.find(u => u.usuario === usuario && u.senha === senha);

if (!user) {
return res.status(401).json({ mensagem: "Login inválido" });
}

if (user.bloqueado) {
return res.status(403).json({ mensagem: "Usuário bloqueado" });
}

res.json({ usuario: user.usuario, tipo: user.tipo });
});

/* ================= DASHBOARD ================= */

app.get("/dashboard-info", (req, res) => {
const hoje = new Date();

const totalClientes = clientes.length;
const clientesAtivos = clientes.filter(c => new Date(c.vencimento) > hoje).length;
const clientesVencidos = clientes.filter(c => new Date(c.vencimento) < hoje).length;

const vencendoHoje = clientes.filter(c => {
const data = new Date(c.vencimento);
return data.toDateString() === hoje.toDateString();
}).length;

const totalRevendedores = usuarios.filter(u => u.tipo === "revendedor").length;

res.json({
creditos: 999999,
totalClientes,
totalRevendedores,
vencendoHoje,
clientesAtivos,
clientesVencidos
});
});

/* ================= CLIENTES ================= */

app.get("/clientes/:usuario", (req, res) => {
const usuario = req.params.usuario;

if (usuario === "admin") {
return res.json(clientes);
}

res.json(clientes.filter(c => c.dono === usuario));
});

/* ================= CRIAR CLIENTE ================= */
app.post("/excluir-cliente", (req, res) => {
const { id } = req.body;

clientes = clientes.filter(c => c.id != id);

fs.writeFileSync(
path.join(__dirname, "clientes.json"),
JSON.stringify(clientes, null, 2)
);

res.json({ mensagem: "Cliente excluído com sucesso" });
});
app.post("/criar-cliente", (req, res) => {
const { email, senha, servidor, dono } = req.body;

if (dono !== "admin") {
const user = usuarios.find(u => u.usuario === dono);

if (!user || user.creditos <= 0) {
return res.status(400).json({ mensagem: "Sem créditos disponíveis" });
}

user.creditos -= 1;
fs.writeFileSync(path.join(__dirname, "usuarios.json"), JSON.stringify(usuarios, null, 2));
}

const data = new Date();
data.setDate(data.getDate() + 30);

clientes.unshift({
id: Date.now(),
email,
senha,
servidor,
dono,
vencimento: data.toISOString()
});

fs.writeFileSync(path.join(__dirname, "clientes.json"), JSON.stringify(clientes, null, 2));

res.json({ mensagem: "Cliente criado com sucesso" });
});

/* ================= REVENDEDORES ================= */


// 🔥 CRIAR REVENDEDOR
app.post("/criar-revendedor", (req, res) => {
const { usuario, senha } = req.body;

const existe = usuarios.find(u => u.usuario === usuario);

if (existe) {
return res.status(400).json({ mensagem: "Usuário já existe" });
}

usuarios.push({
usuario,
senha,
tipo: "revendedor",
creditos: 0
});

fs.writeFileSync(
path.join(__dirname, "usuarios.json"),
JSON.stringify(usuarios, null, 2)
);

res.json({ mensagem: "Revendedor criado com sucesso" });
});
app.post("/excluir-usuario", (req, res) => {
const { usuario } = req.body;

// remove o usuário
usuarios = usuarios.filter(u => u.usuario !== usuario);

// salva no arquivo
fs.writeFileSync(
path.join(__dirname, "usuarios.json"),
JSON.stringify(usuarios, null, 2)
);

res.json({ mensagem: "Usuário excluído" });
});

// 🔥 LISTAR REVENDEDORES
app.get("/revendedores", (req, res) => {
const lista = usuarios.filter(u => u.tipo === "revendedor");
res.json(lista);
});

/* ================= SERVIDOR ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
console.log("Servidor rodando na porta " + PORT);
});