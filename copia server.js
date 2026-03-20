const express = require("express");
const app = express();

app.use(express.json());

let clientes = [];
//pagina principal
app.get("/", (req, res) => {
    res.sendFile(___dirname + "/screen.html");
}); 
//listar clientes
app.get ("/clientes", (req, res) => {
res.json(clientes);
});
//criar clientes manual (teste rapido)
app.get("/teste-criar", (req, res) => {

        const novoCliente = {
            id: clientes.length + 1,
            email: "teste@email.com",
            senha: "123456",
            vencimento: "2026-04-01"
        };
        clientes.push(novoCliente);

        res.json({
            mensagem: "cliente criado via teste",
            cliente: novoCliente
        });

    });
    //criar cliene pelo painel
    app.post("/criar-cliente", (req, res) => {

    const { email, senha, plano } = req.body;

    const hoje = new Date();
    let vencimento = new Date ();
    
    if (plano === "mensal") {
        vencimento.setMonth(hoje.getMonth() + 1);
    } else if (plano === "trimestral") {
            vencimento.setMonth(hoje.getMonth() + 3);
    } else if (plano === "semestral") {
                vencimento.setMonth(hoje.getMonth() + 6);
    } else if (plano === "anual") {
                    vencimento.setFullYear(hoje.getFullyear() + 1);
                }

            const novoCliente = {
        id: clientes.length + 1,
        email,
        senha,
        vencimento: vencimento.toISOString(),
        status: "ativo"
    };

    clientes.push(novocliente);

    res.json({
        mensagem:"cliente criado com sucesso",
        cliente: novoCliente
    });
});
//login
    app.post("/login", (req, res) => {
        
        const { email, senha } = req.body;

        const cliente = clientes.find(c => c.email === email);

        if (!cliente) {
            return res.json({mensagem: "senha incorreta" });
        }

const hoje = new Date ();
const vencimento = new Date(cliente.vencimento);

if (hoje > vencimento) {
    cliente.status = "inativo";
    return res.json({mensagem: "assinatura vencida" });
}
res.json({
    mensagem: "login realizado com sucesso",
    cliente
});

    });
//sempre por último
    app.listen(3000, () => {
        console.log("servidor rodando na porta 3000");
    })
