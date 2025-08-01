/**
 * API模块 - 负责与后端服务通信
 */
class InventoryAPI {
  constructor() {
    // 登入状态
    this.isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    // 全部商品
    this.allProduct = new Map();
    // 往来单位
    this.suppliers = new Map();
    // 客户单位
    this.customers = new Map();
    // 初始化时从 localStorage 获取缓存数据和版本号
    const cachedData = localStorage.getItem('cachedAllData');
    const cachedVersion = localStorage.getItem('dataVersion');
    if (cachedData && cachedVersion) {
      this.allData = JSON.parse(cachedData);
      this.cachedVersion = cachedVersion;
    }
  }

  /**
   * 调用金山云服务API
   * @param {Object} upText - 请求参数
   * @returns {Promise<any>} - API响应数据
   */
  async cloudContext(upText) {
    try {
      const baseUrl = 'https://www.kdocs.cn/api/v3/ide/file/376458734559/script/V2-116KoKukgp1oRnx8QREi07/sync_task';
      const token = '5KxuHXTf55oIsqWXNQCmfb';
      const response = await fetch(baseUrl, {
        headers: {
          'Content-Type': 'application/json',
          'AirScript-Token': token
        },
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ Context: { argv: upText } })
      });

      if (!response.ok) {
        throw new Error(`HTTP错误, 状态码: ${response.status}`);
      }

      const data = await response.json();
      return data.data.result;
    } catch (error) {
      console.error('API请求错误:', error);
      this.showNotification('错误', '网络请求失败，请检查网络连接', 'error');
      throw error;
    }
  }

  /**
   * 用户登录验证
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<boolean>} - 登录是否成功
   */
  async login(username, password) {
    try {
      this.isAuthenticated = await this.cloudContext({ api: 'login', name: username, pw: password });
      if (!this.isAuthenticated) throw new Error('请检查用户名和密码');
      await this.fetchAllData();
      // 登录成功后保存状态
      localStorage.setItem('isAuthenticated', 'true');
      this.showNotification('成功', '登录成功', 'success');
      return true;
    } catch (error) {
      // 登录失败后清除状态
      localStorage.setItem('isAuthenticated', 'false');
      this.isAuthenticated = false;
      this.showNotification('错误', '登录失败', 'error');
      return false;
    }
  }

  /**
   * 登出
   */
  logout() {
    // 登出后清除状态
    localStorage.setItem('isAuthenticated', 'false');
    this.isAuthenticated = false;
    this.showNotification('提示', '已成功登出', 'info');
  }

  /**
   * 获取数据版本
   * @returns {Promise<string>} - 数据版本号
   */
  async getVersion() {
    return this.cloudContext({ api: 'getVer' });
  }

  /**
   * 获取全部库存数据，增加版本号检查逻辑
   * @returns {Promise<Object[]>} - 库存数据列表
   */
  async fetchAllData() {
    try {
      const currentVersion = await this.getVersion();
      // 检查本地缓存版本是否与当前版本一致
      if (this.cachedVersion == currentVersion && this.allData) {
        this.showNotification('未发现新数据', '跳过更新');
      } else {
        this.allData = await this.cloudContext({ api: 'getData' });
        this.cachedVersion = currentVersion;
        // 将数据和版本号缓存到 localStorage
        localStorage.setItem('cachedAllData', JSON.stringify(this.allData));
        localStorage.setItem('dataVersion', currentVersion);
        this.showNotification('更新了', '网络数据已同步');
      }

      // 处理数据
      const productInfo = {};
      this.crData = new Map();
      this.allData.forEach(v => {
        v.dh.slice(0, 3) == 'RKD' ? this.suppliers.set(v.dw, {}) : this.customers.set(v.dw, {})
        this.crData.set(v.dh, [v.dw, v.qd]);
        v.qd.forEach(([name, unit, quantity, amount]) => {
          if (!unit) unit = '-';
          const price = quantity ? amount / quantity : 0;
          if (!productInfo[name]) {
            productInfo[name] = {
              unit,
              prices: [price],
            };
          } else {
            productInfo[name].prices.push(price);
          }
        });
      });

      // 处理商品信息
      const multiple = 2;
      for (const [name, info] of Object.entries(productInfo)) {
        const prices = [...new Set(info.prices)].filter(v => v);
        this.allProduct.set(name, {
          unit: info.unit,
          newPrice: info.prices[0] * multiple,
          maxPrice: Math.max(...prices) * multiple,
          minPrice: Math.min(...prices) * multiple,
          avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length * multiple,
        });
      };

    } catch (error) {
      console.error('获取数据失败:', error);
      // 如果网络请求失败，尝试使用缓存数据
      if (this.allData) {
        this.showNotification('网络请求失败', '使用本地缓存数据');
      }
      throw error;
    }
  }

  /**
   * 添加或更新库存记录
   * @param {Object} data - 库存记录数据
   * @param {string} data.dh - 单号
   * @param {string} data.dw - 往来单位
   * @param {Array<Array<string>>} data.qd - 清单数据
   * @returns {Promise<Object>} - 更新结果
   */
  async updateRecord(data) {
    return this.cloudContext({
      api: 'update',
      data: data
    });
  }

  /**
   * 显示通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {string} type - 通知类型 (success, error, warning, info)
   */
  showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationIcon = document.getElementById('notificationIcon').querySelector('i');

    if (!notification) {
      console.error('未找到通知元素，请检查 HTML 结构');
      return;
    }

    // 设置通知内容
    notificationMessage.textContent = `${title},  ${message}`;

    // 设置通知类型样式
    const iconClass = {
      info: 'fa-info-circle',
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle'
    };

    const bgColorClass = {
      info: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      error: 'bg-danger/10 text-danger',
      warning: 'bg-warning/10 text-warning'
    };

    notificationIcon.className = `fa ${iconClass[type] || 'fa-info-circle'}`;
    document.getElementById('notificationIcon').className = `mr-3 p-2 rounded-full ${bgColorClass[type] || 'bg-primary/10 text-primary'}`;

    // 确保通知处于隐藏状态
    this.hideNotification();

    // 显示通知
    setTimeout(() => {
      notification.classList.remove('opacity-0', 'translate-y-[-20px]');
      notification.classList.add('opacity-100', 'translate-y-0');
    }, 50);

    // 自动关闭
    const timeoutId = setTimeout(() => {
      this.hideNotification();
    }, 3000);

    // 点击关闭按钮
    document.getElementById('closeNotification').onclick = () => {
      clearTimeout(timeoutId);
      this.hideNotification();
    };
  }

  /**
   * 隐藏通知
   */
  hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
      notification.classList.remove('opacity-100', 'translate-y-0');
      notification.classList.add('opacity-0', 'translate-y-[-20px]');
    }
  }


}

// 导出API实例
export const api = new InventoryAPI();
