/**
 * Resend-Online Worker
 * 处理邮件发送 API 请求
 */

import { Resend } from 'resend';

// 定义环境变量类型
interface Env {
	RESEND_API_KEY?: string;
}

// CORS 响应头
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

// 处理 OPTIONS 预检请求
function handleOptions(): Response {
	return new Response(null, {
		headers: corsHeaders,
	});
}

// 返回 JSON 响应
function jsonResponse(data: any, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders,
		},
	});
}

// 邮件发送请求参数
interface SendEmailRequest {
	apiKey: string;
	from: string;
	to: string | string[];
	cc?: string | string[];
	bcc?: string | string[];
	subject: string;
	text?: string;
	html?: string;
	attachments?: Array<{
		filename: string;
		content: string; // Base64 编码
	}>;
}

// 验证邮箱格式
function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 验证请求参数
function validateRequest(body: any): { valid: boolean; error?: string } {
	if (!body.apiKey || typeof body.apiKey !== 'string') {
		return { valid: false, error: 'apiKey 是必填项' };
	}

	if (!body.from || !isValidEmail(body.from)) {
		return { valid: false, error: '无效的发件人邮箱' };
	}

	if (!body.to) {
		return { valid: false, error: 'to 是必填项' };
	}

	// 验证收件人
	const toList = Array.isArray(body.to) ? body.to : [body.to];
	for (const email of toList) {
		if (!isValidEmail(email)) {
			return { valid: false, error: `无效的收件人邮箱: ${email}` };
		}
	}

	if (!body.subject || typeof body.subject !== 'string') {
		return { valid: false, error: 'subject 是必填项' };
	}

	if (!body.text && !body.html) {
		return { valid: false, error: '必须提供 text 或 html 内容' };
	}

	return { valid: true };
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// 处理 OPTIONS 请求
		if (request.method === 'OPTIONS') {
			return handleOptions();
		}

		// 健康检查
		if (url.pathname === '/health' && request.method === 'GET') {
			return jsonResponse({ ok: true, service: 'resend-online' });
		}

		// 邮件发送 API
		if (url.pathname === '/api/send' && request.method === 'POST') {
			try {
				const body: SendEmailRequest = await request.json();

				// 验证请求参数
				const validation = validateRequest(body);
				if (!validation.valid) {
					return jsonResponse({ success: false, error: validation.error }, 400);
				}

				// 使用用户提供的 API key 初始化 Resend
				const resend = new Resend(body.apiKey);

				// 构建邮件参数
				const emailParams: any = {
					from: body.from,
					to: body.to,
					subject: body.subject,
				};

				if (body.cc) emailParams.cc = body.cc;
				if (body.bcc) emailParams.bcc = body.bcc;
				if (body.text) emailParams.text = body.text;
				if (body.html) emailParams.html = body.html;

				// 处理附件
				if (body.attachments && body.attachments.length > 0) {
					emailParams.attachments = body.attachments.map((att) => ({
						filename: att.filename,
						content: att.content,
					}));
				}

				// 发送邮件
				const { data, error } = await resend.emails.send(emailParams);

				if (error) {
					console.error('Resend API error:', error);
					return jsonResponse(
						{
							success: false,
							error: error.message || '邮件发送失败',
						},
						400
					);
				}

				return jsonResponse({
					success: true,
					id: data?.id,
					message: '邮件发送成功',
				});
			} catch (error: any) {
				console.error('Worker error:', error);
				return jsonResponse(
					{
						success: false,
						error: error.message || '服务器内部错误',
					},
					500
				);
			}
		}

		// 404
		return jsonResponse({ error: '路由不存在' }, 404);
	},
};
