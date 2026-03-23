const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
'https://gcqahmegpidkgedokbaa.supabase.co',
'sb_publishable_Hdwuix4_G8H1l1ywDiSa0g_27Ut_b4R'
);

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

app.post("/login", async (req, res) => {
const { usuario, senha } = req.body;

// admin continua igual
if (usuario === "admin" && senha === "Gabriel") {
return res.json({ usuario: "admin", tipo: "admin" });
}

const { data: user, error } = await supabase
.from("usuarios")
.select("*")
.eq("usuario", usuario)
.eq("senha", senha)
.single();

if (error || !user) {
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

app.get("/clientes/:usuario", async (req, res) => {
const usuario = req.params.usuario;

let query = supabase.from("clientes").select("*");

if (usuario !== "admin") {
query = query.eq("dono", usuario);
}

const { data, error } = await query;

if (error) {
console.log(error);
return res.status(500).json({ erro: error.message });
}

res.json(data);
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
app.post("/criar-cliente", async (req, res) => {
const { email, senha, servidor, dono } = req.body;

const data = new Date();
data.setDate(data.getDate() + 30);

const { error } = await supabase.from("clientes").insert([
{
email,
senha,
servidor,
dono,
vencimento: data.toISOString()
}
]);

if (error) {
return res.json({ erro: error.message });
}

res.json({ mensagem: "Cliente criado com sucesso" });
});

/* ================= REVENDEDORES ================= */


// 🔥 CRIAR REVENDEDOR
app.post("/criar-revendedor", async (req, res) => {
const { usuario, senha } = req.body;

// verifica se já existe
const { data: existe } = await supabase
.from("usuarios")
.select("*")
.eq("usuario", usuario)
.single();

if (existe) {
return res.status(400).json({ mensagem: "Usuário já existe" });
}

const { error } = await supabase.from("usuarios").insert([
{
usuario,
senha,
tipo: "revendedor",
creditos: 0,
bloqueado: false
}
]);

if (error) {
console.log(error);
return res.status(500).json({ erro: error.message });
}

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
app.get("/revendedores", async (req, res) => {
const { data, error } = await supabase
.from("usuarios")
.select("*")
.eq("tipo", "revendedor");

if (error) {
console.log(error);
return res.status(500).json({ erro: error.message });
}

res.json(data);
});
/* ================= SERVIDOR ================= */
app.get("/teste", async (req, res) => {
const { data, error } = await supabase
.from("usuarios")
.select("*");

if (error) {
return res.json({ erro: error.message });
}

res.json(data);
});
const PORT = process.env.PORT || 3000;
app.get("/ping", (req, res) => {
res.send("ok");
});
app.listen(PORT, "0.0.0.0", () => {
console.log("Servidor rodando na porta " + PORT);
});