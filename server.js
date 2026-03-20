const express = require("express");
const fs = require("fs");
const path = require("path"); // 🔥 ADICIONADO

const app = express();

app.use(express.json());
app.use(express.static("public"));

let clientes = [];
let usuarios = [];

/* ================= CARREGAR ================= */

if (fs.existsSync("clientes.json")) {
clientes = JSON.parse(fs.readFileSync("clientes.json"));
}

if (fs.existsSync("usuarios.json")) {
usuarios = JSON.parse(fs.readFileSync("usuarios.json"));
}

/* 🔥 ROTA PRINCIPAL (NÃO EXISTIA) */
app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ================= LOGIN ================= */

app.post("/login", (req, res) => {

const { usuario, senha } = req.body;

if(usuario === "admin" && senha === "123456"){
return res.json({ usuario:"admin", tipo:"admin" });
}

const user = usuarios.find(u => u.usuario === usuario && u.senha === senha);

if(!user){
return res.status(401).json({ mensagem:"Login inválido" });
}

if(user.bloqueado){
return res.status(403).json({ mensagem:"Usuário bloqueado" });
}

res.json({ usuario:user.usuario, tipo:user.tipo });

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

res.json({
creditos: 999999,
totalClientes,
totalRevendedores: usuarios.length,
vencendoHoje,
clientesAtivos,
clientesVencidos
});

});

/* ================= CLIENTES ================= */

app.get("/clientes/:usuario", (req, res) => {

const usuario = req.params.usuario;

if(usuario === "admin"){
return res.json(clientes);
}

res.json(clientes.filter(c => c.dono === usuario));

});

/* 🔥 CRIAR CLIENTE COM CONTROLE DE CRÉDITO */
app.post("/criar-cliente", (req, res) => {

const { email, senha, servidor, dono } = req.body;

if(dono !== "admin"){

const user = usuarios.find(u => u.usuario === dono);

if(!user || user.creditos <= 0){
return res.status(400).json({ mensagem:"Sem créditos disponíveis" });
}

user.creditos -= 1;
fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));

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

fs.writeFileSync("clientes.json", JSON.stringify(clientes, null, 2));

res.json({ mensagem:"Cliente criado com sucesso" });

});

/* 🔥 EDITAR CLIENTE */
app.put("/editar-cliente/:id", (req,res)=>{

const cliente = clientes.find(c=>c.id == req.params.id);

if(cliente){

if(req.body.email) cliente.email = req.body.email;
if(req.body.senha) cliente.senha = req.body.senha;
if(req.body.servidor) cliente.servidor = req.body.servidor;

fs.writeFileSync("clientes.json", JSON.stringify(clientes,null,2));

return res.json({ok:true});
}

res.status(404).json({mensagem:"Cliente não encontrado"});

});

/* RENOVAR */
app.put("/renovar/:id", (req, res) => {

const id = parseInt(req.params.id);
const meses = Number(req.body.meses || 1);

const cliente = clientes.find(c => c.id === id);

if(!cliente){
return res.status(404).json({ mensagem:"Não encontrado" });
}

const base = new Date(
new Date(cliente.vencimento) > new Date()
? cliente.vencimento
: new Date()
);

base.setMonth(base.getMonth() + meses);

cliente.vencimento = base.toISOString();

fs.writeFileSync("clientes.json", JSON.stringify(clientes, null, 2));

res.json({ mensagem:"Renovado com sucesso" });

});

/* EXCLUIR CLIENTE */
app.delete("/excluir/:id", (req, res) => {

const id = parseInt(req.params.id);

clientes = clientes.filter(c => c.id !== id);

fs.writeFileSync("clientes.json", JSON.stringify(clientes, null, 2));

res.json({ mensagem:"Cliente excluído" });

});

/* ================= REVENDEDORES ================= */

app.get("/usuarios/:usuario", (req, res) => {

const usuario = req.params.usuario;

const lista = usuario === "admin"
? usuarios
: usuarios.filter(u => u.pai === usuario);

const resultado = lista.map(u => {

const totalClientes = clientes.filter(c => c.dono === u.usuario).length;

return {
...u,
totalClientes
};

});

res.json(resultado);

});

/* CRIAR REVENDEDOR */
app.post("/criar-subrevendedor", (req, res) => {

const { usuario, senha, pai } = req.body;

usuarios.unshift({
usuario,
senha,
tipo:"revendedor",
creditos:0,
pai,
bloqueado:false
});

fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));

res.json({ mensagem:"Revendedor criado com sucesso" });

});

/* EDITAR SENHA */
app.post("/editar-usuario", (req, res) => {

const { usuario, senha } = req.body;

const user = usuarios.find(u => u.usuario === usuario);

if(user){
user.senha = senha;
}

fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));

res.json({ mensagem:"Atualizado com sucesso" });

});

/* BLOQUEAR */
app.post("/bloquear", (req, res) => {

const { usuario } = req.body;

const user = usuarios.find(u => u.usuario === usuario);

if(user){
user.bloqueado = !user.bloqueado;
}

fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));

res.json({ mensagem:"Status alterado" });

});

/* EXCLUIR */
app.post("/excluir-usuario", (req, res) => {

const { usuario } = req.body;

usuarios = usuarios.filter(u => u.usuario !== usuario);

fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));

res.json({ mensagem:"Excluído com sucesso" });

});

/* ================= CREDITOS ================= */

app.post("/adicionar-creditos", (req, res) => {

const { usuario, creditos } = req.body;

const user = usuarios.find(u => u.usuario === usuario);

if(user){
user.creditos += Number(creditos);
}

fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));

res.json({ mensagem:"Créditos adicionados com sucesso" });

});

/* 🔥 CORREÇÃO FINAL */
app.get("/creditos/:usuario", (req, res) => {

let usuario = req.params.usuario;

if (fs.existsSync("usuarios.json")) {
usuarios = JSON.parse(fs.readFileSync("usuarios.json"));
}

if(usuario === "admin"){
return res.json({ creditos: 999999 });
}

const user = usuarios.find(u => u.usuario === usuario);

return res.json({ creditos: user ? user.creditos : 0 });

}); 

/* ================= SERVIDOR ================= */

const PORT = process.env.PORT || 8080; // 🔥 CORREÇÃO RAILWAY

app.listen(PORT, "0.0.0.0",  () => {
console.log("servidor rodando na porta" + PORT);
});