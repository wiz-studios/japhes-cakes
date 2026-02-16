import net from "node:net"
import tls from "node:tls"

type SendMailInput = {
	host: string
	port: number
	secure: boolean
	user: string
	pass: string
	from: string
	to: string
	subject: string
	text: string
}

type SmtpSocket = net.Socket | tls.TLSSocket
type SmtpResponse = {
	code: number
	raw: string
}

function buildMessage({ from, to, subject, text }: Pick<SendMailInput, "from" | "to" | "subject" | "text">) {
	const cleanSubject = subject.replace(/\r?\n/g, " ")
	const body = text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..")

	return [
		`From: ${from}`,
		`To: ${to}`,
		`Subject: ${cleanSubject}`,
		"MIME-Version: 1.0",
		'Content-Type: text/plain; charset="UTF-8"',
		"Content-Transfer-Encoding: 8bit",
		"",
		body,
		"",
	].join("\r\n")
}

function onceData(socket: SmtpSocket): Promise<string> {
	return new Promise((resolve, reject) => {
		const onData = (chunk: Buffer) => {
			cleanup()
			resolve(chunk.toString("utf8"))
		}
		const onError = (error: Error) => {
			cleanup()
			reject(error)
		}
		const onClose = () => {
			cleanup()
			reject(new Error("SMTP connection closed unexpectedly"))
		}
		const cleanup = () => {
			socket.off("data", onData)
			socket.off("error", onError)
			socket.off("close", onClose)
		}

		socket.on("data", onData)
		socket.on("error", onError)
		socket.on("close", onClose)
	})
}

async function readResponse(socket: SmtpSocket): Promise<SmtpResponse> {
	let full = ""

	while (true) {
		const chunk = await onceData(socket)
		full += chunk

		const lines = full.trim().split(/\r?\n/)
		const last = lines[lines.length - 1]
		if (/^\d{3} /.test(last)) {
			const code = Number(last.slice(0, 3))
			return { code, raw: full }
		}
	}
}

async function sendCommand(socket: SmtpSocket, command: string, expectedCodes: number[]): Promise<SmtpResponse> {
	socket.write(`${command}\r\n`)
	const response = await readResponse(socket)
	if (!expectedCodes.includes(response.code)) {
		throw new Error(`SMTP command failed (${command}): ${response.raw}`)
	}
	return response
}

function supportsStartTls(response: SmtpResponse) {
	return /(?:^|\n)250[- ]STARTTLS(?:\r?$)/im.test(response.raw)
}

async function upgradeToTls(socket: SmtpSocket, host: string) {
	const tlsSocket = tls.connect({
		socket,
		host,
		servername: host,
	})

	await new Promise<void>((resolve, reject) => {
		tlsSocket.once("secureConnect", () => resolve())
		tlsSocket.once("error", reject)
	})

	return tlsSocket
}

export async function sendSmtpMail(input: SendMailInput) {
	let socket: SmtpSocket = input.secure
		? tls.connect({ host: input.host, port: input.port, servername: input.host })
		: net.createConnection({ host: input.host, port: input.port })

	await new Promise<void>((resolve, reject) => {
		const readyEvent = input.secure ? "secureConnect" : "connect"
		socket.once(readyEvent, () => resolve())
		socket.once("error", reject)
	})

	try {
		const greeting = await readResponse(socket)
		if (greeting.code !== 220) {
			throw new Error(`SMTP greeting failed: ${greeting.raw}`)
		}

		let ehlo = await sendCommand(socket, "EHLO localhost", [250])

		if (!input.secure && supportsStartTls(ehlo)) {
			await sendCommand(socket, "STARTTLS", [220])
			socket = await upgradeToTls(socket, input.host)
			ehlo = await sendCommand(socket, "EHLO localhost", [250])
		}

		await sendCommand(socket, "AUTH LOGIN", [334])
		await sendCommand(socket, Buffer.from(input.user).toString("base64"), [334])
		await sendCommand(socket, Buffer.from(input.pass).toString("base64"), [235])
		await sendCommand(socket, `MAIL FROM:<${input.from}>`, [250])
		await sendCommand(socket, `RCPT TO:<${input.to}>`, [250, 251])
		await sendCommand(socket, "DATA", [354])

		const message = buildMessage(input)
		socket.write(`${message}\r\n.\r\n`)
		const dataResponse = await readResponse(socket)
		if (dataResponse.code !== 250) {
			throw new Error(`SMTP data send failed: ${dataResponse.raw}`)
		}

		await sendCommand(socket, "QUIT", [221])
	} finally {
		socket.end()
	}
}
