<script setup lang="ts">
import { ref } from 'vue';

// 表单数据
const apiKey = ref('');
const from = ref('');
const to = ref('');
const cc = ref('');
const bcc = ref('');
const subject = ref('');
const contentType = ref<'text' | 'html'>('text');
const textContent = ref('');
const htmlContent = ref('');
const attachments = ref<Array<{ filename: string; content: string }>>([]);

// UI 状态
const loading = ref(false);
const message = ref('');
const messageDetail = ref(''); // 详细信息（支持 HTML）
const messageType = ref<'success' | 'error' | ''>('');

// 分割邮箱地址（逗号或分号分隔）
function splitEmails(str: string): string[] {
  return str
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

// 文件上传转 Base64
async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files) return;

  const newAttachments: Array<{ filename: string; content: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // 限制单个文件大小 5MB
    if (file.size > 5 * 1024 * 1024) {
      showMessage(`文件 ${file.name} 超过 5MB 限制`, 'error');
      continue;
    }

    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onload = () => {
        const base64 = reader.result as string;
        // 移除 data:*/*;base64, 前缀
        const content = base64.split(',')[1];
        resolve(content);
      };
    });

    reader.readAsDataURL(file);
    const content = await base64Promise;

    newAttachments.push({
      filename: file.name,
      content,
    });
  }

  attachments.value = [...attachments.value, ...newAttachments];

  // 清空 input
  target.value = '';
}

// 移除附件
function removeAttachment(index: number) {
  attachments.value.splice(index, 1);
}

// 显示消息
function showMessage(msg: string, type: 'success' | 'error') {
  messageType.value = type;

  // 解析并美化错误消息
  if (type === 'error') {
    // 检测 Resend 测试限制错误
    const testingMatch = msg.match(/You can only send testing emails to your own email address \((.+?)\)/);
    if (testingMatch) {
      message.value = '发送失败';
      messageDetail.value = `
        <div class="space-y-2">
          <div>测试环境限制：只能发送到你的账户邮箱</div>
          <div>可发送地址：<span class="bg-red-100 px-2 py-1 rounded font-mono font-semibold">${testingMatch[1]}</span></div>
        </div>
      `;
    } else {
      // 其他错误：自动高亮邮箱地址
      message.value = '发送失败';
      const highlighted = msg.replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        '<span class="bg-red-100 px-1 rounded font-mono font-semibold">$1</span>'
      );
      messageDetail.value = highlighted;
    }
  } else {
    // 成功消息
    message.value = msg;
    messageDetail.value = '';
  }

  // 仅成功消息自动消失，错误消息持久显示
  if (type === 'success') {
    setTimeout(() => {
      message.value = '';
      messageDetail.value = '';
      messageType.value = '';
    }, 5000);
  }
}

// 发送邮件
async function sendEmail() {
  // 清空之前的消息
  message.value = '';
  messageDetail.value = '';
  messageType.value = '';

  // 验证必填字段
  if (!apiKey.value.trim()) {
    showMessage('请输入 Resend API Key', 'error');
    return;
  }
  if (!from.value.trim()) {
    showMessage('请输入发件人邮箱', 'error');
    return;
  }
  if (!to.value.trim()) {
    showMessage('请输入收件人邮箱', 'error');
    return;
  }
  if (!subject.value.trim()) {
    showMessage('请输入邮件主题', 'error');
    return;
  }

  const content = contentType.value === 'text' ? textContent.value : htmlContent.value;
  if (!content.trim()) {
    showMessage('请输入邮件内容', 'error');
    return;
  }

  loading.value = true;

  try {
    const requestBody: any = {
      apiKey: apiKey.value.trim(),
      from: from.value.trim(),
      to: splitEmails(to.value),
      subject: subject.value.trim(),
    };

    // 可选字段
    if (cc.value.trim()) {
      requestBody.cc = splitEmails(cc.value);
    }
    if (bcc.value.trim()) {
      requestBody.bcc = splitEmails(bcc.value);
    }

    // 内容
    if (contentType.value === 'text') {
      requestBody.text = textContent.value;
    } else {
      requestBody.html = htmlContent.value;
    }

    // 附件
    if (attachments.value.length > 0) {
      requestBody.attachments = attachments.value;
    }

    // 获取 API 地址（支持环境变量配置）
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${API_BASE_URL}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (result.success) {
      showMessage(`邮件发送成功！ID: ${result.id}`, 'success');
      // 清空表单（保留 API key）
      resetForm(false);
    } else {
      showMessage(`发送失败：${result.error}`, 'error');
    }
  } catch (error: any) {
    showMessage(`请求错误：${error.message}`, 'error');
  } finally {
    loading.value = false;
  }
}

// 重置表单
function resetForm(resetApiKey = true) {
  if (resetApiKey) {
    apiKey.value = '';
  }
  from.value = '';
  to.value = '';
  cc.value = '';
  bcc.value = '';
  subject.value = '';
  textContent.value = '';
  htmlContent.value = '';
  attachments.value = [];
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <form @submit.prevent="sendEmail" class="space-y-6">
      <!-- API Key -->
      <div>
        <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-2">
          Resend API Key <span class="text-red-500">*</span>
        </label>
        <input
          id="apiKey"
          v-model="apiKey"
          type="password"
          placeholder="re_xxxxxxxxxxxx"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        />
        <p class="text-xs text-gray-500 mt-1">
          你的 API Key 仅用于本次发送，不会被存储
        </p>
      </div>

      <!-- 发件人 -->
      <div>
        <label for="from" class="block text-sm font-medium text-gray-700 mb-2">
          发件人 (From) <span class="text-red-500">*</span>
        </label>
        <input
          id="from"
          v-model="from"
          type="email"
          placeholder="sender@example.com"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        />
      </div>

      <!-- 收件人 -->
      <div>
        <label for="to" class="block text-sm font-medium text-gray-700 mb-2">
          收件人 (To) <span class="text-red-500">*</span>
        </label>
        <input
          id="to"
          v-model="to"
          type="text"
          placeholder="recipient@example.com 或多个邮箱用逗号分隔"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        />
      </div>

      <!-- 抄送 -->
      <div>
        <label for="cc" class="block text-sm font-medium text-gray-700 mb-2">
          抄送 (CC)
        </label>
        <input
          id="cc"
          v-model="cc"
          type="text"
          placeholder="cc@example.com 或多个邮箱用逗号分隔"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        />
      </div>

      <!-- 密送 -->
      <div>
        <label for="bcc" class="block text-sm font-medium text-gray-700 mb-2">
          密送 (BCC)
        </label>
        <input
          id="bcc"
          v-model="bcc"
          type="text"
          placeholder="bcc@example.com 或多个邮箱用逗号分隔"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        />
      </div>

      <!-- 主题 -->
      <div>
        <label for="subject" class="block text-sm font-medium text-gray-700 mb-2">
          主题 (Subject) <span class="text-red-500">*</span>
        </label>
        <input
          id="subject"
          v-model="subject"
          type="text"
          placeholder="邮件主题"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        />
      </div>

      <!-- 内容类型切换 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          内容类型 <span class="text-red-500">*</span>
        </label>
        <div class="flex gap-4">
          <label class="flex items-center">
            <input
              v-model="contentType"
              type="radio"
              value="text"
              class="mr-2"
              :disabled="loading"
            />
            <span>纯文本</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="contentType"
              type="radio"
              value="html"
              class="mr-2"
              :disabled="loading"
            />
            <span>HTML</span>
          </label>
        </div>
      </div>

      <!-- 邮件内容 -->
      <div v-if="contentType === 'text'">
        <label for="textContent" class="block text-sm font-medium text-gray-700 mb-2">
          邮件内容 (纯文本) <span class="text-red-500">*</span>
        </label>
        <textarea
          id="textContent"
          v-model="textContent"
          rows="8"
          placeholder="请输入邮件内容..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        ></textarea>
      </div>

      <div v-else>
        <label for="htmlContent" class="block text-sm font-medium text-gray-700 mb-2">
          邮件内容 (HTML) <span class="text-red-500">*</span>
        </label>
        <textarea
          id="htmlContent"
          v-model="htmlContent"
          rows="8"
          placeholder="<h1>Hello</h1><p>请输入 HTML 内容...</p>"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          :disabled="loading"
        ></textarea>
      </div>

      <!-- 附件上传 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          附件（可选，单个文件最大 5MB）
        </label>
        <input
          type="file"
          multiple
          @change="handleFileUpload"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="loading"
        />

        <!-- 已上传的附件列表 -->
        <div v-if="attachments.length > 0" class="mt-3 space-y-2">
          <div
            v-for="(att, index) in attachments"
            :key="index"
            class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
          >
            <span class="text-sm text-gray-700">{{ att.filename }}</span>
            <button
              type="button"
              @click="removeAttachment(index)"
              class="text-red-600 hover:text-red-800 text-sm"
              :disabled="loading"
            >
              移除
            </button>
          </div>
        </div>
      </div>

      <!-- 消息提示 -->
      <div
        v-if="message"
        :class="[
          'p-4 rounded-lg space-y-2',
          messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800',
        ]"
      >
        <div class="font-semibold">{{ message }}</div>
        <div v-if="messageDetail" v-html="messageDetail" class="text-sm"></div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-4">
        <button
          type="submit"
          :disabled="loading"
          class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {{ loading ? '发送中...' : '发送邮件' }}
        </button>
        <button
          type="button"
          @click="resetForm()"
          :disabled="loading"
          class="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          重置
        </button>
      </div>
    </form>
  </div>
</template>
