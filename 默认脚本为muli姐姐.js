// ==UserScript==
// @name         沐里摸鱼脚本
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  一键变身！访问任意用户主页点击“变身成TA”，即可把全站所有人（聊天室、侧边栏、卡片等）都替换成该用户的模样。
// @author       You
// @match        https://fishpi.cn/*
// @icon         https://file.fishpi.cn/2025/11/blob-4d0e46ad.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // =================================================================
    // 1. 数据管理区：默认数据 + 本地存储读取
    // =================================================================

    // 默认身份：沐里 (作为保底)
    const DEFAULT_DATA = {
        avatar: "https://file.fishpi.cn/2025/11/blob-4d0e46ad.png",
        name: "沐里 (muli)",
        realName: "沐里",
        shortName: "muli",
        profileUrl: "https://fishpi.cn/member/muli",
        nameStyle: "font-weight: bold; text-decoration: underline; color: #9a808f;",
        titleImg: "https://fishpi.cn/gen?ver=0.1&scale=0.79&txt=&url=https://file.fishpi.cn/2021/12/ht1-d8149de4.jpg&backcolor=ffffff&fontcolor=ff3030",
        titleText: "摸鱼派粉丝 - 捐助摸鱼派达16; 编号No.146",
        clientTooltip: "Web PC网页端",
        clientIcon: "#ic-fish",
        cardBackground: "https://file.fishpi.cn/2025/11/微信图片20251126093253007-10b4c169.jpg",
        intro: "保持独立思考，不卑不亢，成为自己喜欢的样子。",
        userNo: "29144"
    };

    // 从 localStorage 读取用户自定义的身份数据
    let TARGET_DATA = DEFAULT_DATA;
    try {
        const savedData = localStorage.getItem('fishpi_cosplay_data');
        if (savedData) {
            TARGET_DATA = { ...DEFAULT_DATA, ...JSON.parse(savedData) };
        }
    } catch (e) {
        console.error("读取本地身份数据失败，使用默认身份", e);
    }

    // =================================================================
    // 2. 身份抓取区：在个人主页注入功能
    // =================================================================

    /**
     * 在个人主页注入“变身”按钮，并处理抓取逻辑
     */
    function injectStealButton() {
        // 仅在个人主页生效 (/member/xxx)
        if (!window.location.href.includes('/member/')) return;

        // 寻找注入点：名字区域
        const nameWrapper = document.querySelector('.user-name');
        if (!nameWrapper) return;

        // 防止重复注入
        if (document.getElementById('btn-cosplay-steal')) return;

        // 创建按钮
        const btn = document.createElement('button');
        btn.id = 'btn-cosplay-steal';
        btn.innerHTML = '👻 变身成TA';
        btn.className = 'red small'; // 使用社区自带的红色按钮样式
        btn.style.marginLeft = '10px';
        btn.style.cursor = 'pointer';
        btn.title = '点击后，全站所有用户都将变成TA的样子';

        // 按钮点击事件：抓取数据
        btn.onclick = function() {
            try {
                // 1. 抓取头像
                let avatarUrl = DEFAULT_DATA.avatar;
                const avatarDom = document.querySelector('#avatarURLDom');
                if (avatarDom) {
                    const bg = avatarDom.style.backgroundImage; // url("...")
                    if (bg && bg.includes('url')) {
                        avatarUrl = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
                    }
                }

                // 2. 抓取名字
                const realNameDom = document.querySelector('#userNicknameDom');
                const realName = realNameDom ? realNameDom.innerText.trim() : "未知用户";

                const shortNameDom = document.querySelector('.user-name .ft-gray');
                // 从URL获取最准确，备选从DOM获取
                const urlParts = window.location.pathname.split('/');
                const shortName = urlParts.length >= 3 ? urlParts[2] : (shortNameDom ? shortNameDom.innerText.trim() : "unknown");

                const fullName = `${realName} (${shortName})`;

                // 3. 抓取简介
                const introDom = document.querySelector('#userIntroDom');
                const intro = introDom ? introDom.innerText.trim() : "这个人很懒，什么都没写。";

                // 4. 抓取编号 (正则匹配数字)
                const infoText = document.querySelector('.user-details') ? document.querySelector('.user-details').innerText : "";
                const noMatch = infoText.match(/(\d+)\s*号成员/);
                const userNo = noMatch ? noMatch[1] : "???";

                // 5. 抓取勋章 (如果有)
                let titleImg = DEFAULT_DATA.titleImg;
                let titleText = DEFAULT_DATA.titleText;
                const metalDom = document.querySelector('#metal img'); // 你的HTML里 #metal 是空的，但如果有勋章通常在这里
                if (metalDom) {
                    titleImg = metalDom.src;
                    titleText = metalDom.title || "";
                }
                // 如果目标没勋章，保留默认的还是置空？这里选择：如果没抓到，就用默认的“摸鱼派粉丝”勋章，避免空荡荡

                // 6. 构造新数据
                const newData = {
                    avatar: avatarUrl,
                    name: fullName,
                    realName: realName,
                    shortName: shortName,
                    profileUrl: `https://fishpi.cn/member/${shortName}`,
                    // 样式随机一点，或者保持粉色
                    nameStyle: "font-weight: bold; text-decoration: underline; color: #9a808f;",
                    titleImg: titleImg,
                    titleText: titleText,
                    clientTooltip: "Web PC网页端", // 客户端暂不抓取，统一伪装成Web
                    clientIcon: "#ic-fish",
                    cardBackground: DEFAULT_DATA.cardBackground, // 背景图较难抓取（通常在CSS里），暂用默认
                    intro: intro,
                    userNo: userNo
                };

                // 7. 保存到 LocalStorage
                localStorage.setItem('fishpi_cosplay_data', JSON.stringify(newData));

                alert(`变身成功！\n现在全站所有人都是 [${realName}] 了。\n页面即将刷新。`);
                location.reload();

            } catch (err) {
                console.error(err);
                alert('抓取失败，请检查控制台报错。');
            }
        };

        // 插入到名字下方或旁边
        // 结构是 .user-name -> div#userNicknameDom ... -> div(按钮区)
        // 我们把它插在 私信/关注 按钮的那一行
        const actionDiv = nameWrapper.querySelectorAll('div')[3]; // 第4个div通常包含按钮
        if (actionDiv) {
            actionDiv.appendChild(btn);
        } else {
            nameWrapper.appendChild(btn);
        }
    }

    // =================================================================
    // 3. 核心替换逻辑 (复用之前的逻辑，但使用 TARGET_DATA)
    // =================================================================

    function processNode(rootNode) {
        if (!rootNode || !rootNode.querySelector) return;

        // --- 规则 1: 聊天室消息 ---
        const chatItems = rootNode.classList?.contains('chats__item') ? [rootNode] : rootNode.querySelectorAll('.chats__item');
        chatItems.forEach(item => {
            const avatar = item.querySelector('.avatar');
            if (avatar) {
                avatar.style.backgroundImage = `url('${TARGET_DATA.avatar}')`;
                const link = avatar.closest('a');
                if (link) link.href = TARGET_DATA.profileUrl;
            }
            const userContainer = item.querySelector('[id="userName"]');
            if (userContainer) {
                const nameSpan = userContainer.querySelector('span');
                if (nameSpan) {
                    nameSpan.innerText = TARGET_DATA.name;
                    nameSpan.style.cssText = TARGET_DATA.nameStyle;
                }
                const badges = userContainer.querySelectorAll('img');
                if (badges.length > 0) {
                    badges.forEach((img, index) => {
                        if (index === 0) {
                            img.src = TARGET_DATA.titleImg;
                            img.title = TARGET_DATA.titleText;
                        } else {
                            img.remove();
                        }
                    });
                } else {
                    const newBadge = document.createElement('img');
                    newBadge.src = TARGET_DATA.titleImg;
                    newBadge.title = TARGET_DATA.titleText;
                    userContainer.appendChild(newBadge);
                }
            }
            const clientSpan = item.querySelector('.date-bar .tooltipped');
            if (clientSpan) {
                clientSpan.setAttribute('aria-label', TARGET_DATA.clientTooltip);
                const iconUse = clientSpan.querySelector('use');
                if (iconUse) {
                    iconUse.setAttribute('xlink:href', TARGET_DATA.clientIcon);
                    iconUse.setAttribute('href', TARGET_DATA.clientIcon);
                }
            }
        });

        // --- 规则 2: 侧边栏列表 ---
        const sideItems = rootNode.querySelectorAll ? rootNode.querySelectorAll('.module-list li') : [];
        sideItems.forEach(li => {
            const smallAvatar = li.querySelector('.avatar-small');
            if (smallAvatar) {
                smallAvatar.style.backgroundImage = `url('${TARGET_DATA.avatar}')`;
                smallAvatar.setAttribute('aria-label', TARGET_DATA.realName);
                const link = smallAvatar.closest('a');
                if (link) link.href = TARGET_DATA.profileUrl;
            }
        });

        // --- 规则 3: 个人菜单面板 ---
        const personPanel = rootNode.querySelector ? rootNode.querySelector('#aPersonListPanel') : null;
        if (personPanel || (rootNode.id === 'aPersonListPanel')) {
            const target = personPanel || rootNode;
            const smallAvatar = target.querySelector('.avatar-small');
            if (smallAvatar) {
                smallAvatar.style.backgroundImage = `url('${TARGET_DATA.avatar}')`;
            }
        }

        // --- 规则 4: 引用/艾特链接 ---
        const mentionLinks = rootNode.querySelectorAll ? rootNode.querySelectorAll('.vditor-reset a[href*="/member/"]') : [];
        mentionLinks.forEach(link => {
            if (!link.querySelector('img') && !link.querySelector('.avatar') && !link.querySelector('.avatar-small')) {
                try {
                    const urlObj = new URL(link.href, window.location.href);
                    const pathSegments = urlObj.pathname.split('/').filter(p => p.trim() !== '');
                    if (pathSegments.length === 2 && pathSegments[0] === 'member') {
                        link.innerText = TARGET_DATA.shortName;
                        link.setAttribute('aria-label', TARGET_DATA.shortName);
                        link.href = TARGET_DATA.profileUrl;
                    }
                } catch (e) {}
            }
        });

        // --- 规则 5: 操作菜单 ---
        const menuItems = rootNode.querySelectorAll ? rootNode.querySelectorAll('.details-menu .item') : [];
        menuItems.forEach(item => {
            const text = item.innerText.trim();
            if (text.startsWith('@')) {
                item.innerText = '@' + TARGET_DATA.shortName;
            }
        });

        // --- 规则 6: 用户信息卡片 ---
        const userCards = rootNode.classList?.contains('user-card') ? [rootNode] : rootNode.querySelectorAll('.user-card');
        userCards.forEach(card => {
            const bgContainer = card.id === 'userCardContent' ? card : card.querySelector('#userCardContent');
            if (bgContainer) bgContainer.style.backgroundImage = `url('${TARGET_DATA.cardBackground}')`;

            const cardAvatar = card.querySelector('.user-card__avatar');
            if (cardAvatar) cardAvatar.style.backgroundImage = `url('${TARGET_DATA.avatar}')`;

            const cardName = card.querySelector('.user-card__name');
            if (cardName) {
                cardName.innerHTML = `<b>${TARGET_DATA.realName}</b>`;
                cardName.href = TARGET_DATA.profileUrl;
            }

            const subName = card.querySelector('.user-card__name-wrapper .ft-gray');
            if (subName) {
                subName.innerHTML = `<b>${TARGET_DATA.shortName}</b>`;
                subName.href = TARGET_DATA.profileUrl;
            }

            const intro = card.querySelector('.user-card__intro');
            if (intro) intro.innerText = TARGET_DATA.intro;

            const medalContainer = card.querySelector('.user-card__medals');
            if (medalContainer) {
                const medals = medalContainer.querySelectorAll('img');
                if (medals.length > 0) {
                    medals.forEach((img, index) => {
                        if (index === 0) {
                            img.src = TARGET_DATA.titleImg;
                            img.title = TARGET_DATA.titleText;
                        } else {
                            img.remove();
                        }
                    });
                } else {
                    const newBadge = document.createElement('img');
                    newBadge.className = 'user-card__medal';
                    newBadge.src = TARGET_DATA.titleImg;
                    newBadge.title = TARGET_DATA.titleText;
                    medalContainer.appendChild(newBadge);
                }
            }

            const noSpan = card.querySelector('.user-card__no span');
            if (noSpan) noSpan.innerText = TARGET_DATA.userNo;

            const links = card.querySelectorAll('a');
            links.forEach(a => {
                if (a.href.includes('/member/')) a.href = TARGET_DATA.profileUrl;
                if (a.href.includes('to=')) a.href = a.href.replace(/to=[^&]+/, `to=${TARGET_DATA.shortName}`);
                if (a.href.includes('toUser=')) a.href = a.href.replace(/toUser=[^&]+/, `toUser=${TARGET_DATA.shortName}`);
            });
        });

        // --- 规则 7: 主页聊天列表 ---
        const indexItems = [];
        if (rootNode.tagName === 'LI' && rootNode.id && rootNode.id.startsWith('chatindex')) indexItems.push(rootNode);
        if (rootNode.querySelectorAll) rootNode.querySelectorAll('li[id^="chatindex"]').forEach(i => indexItems.push(i));
        indexItems.forEach(item => {
            const avatar = item.querySelector('.avatar');
            if (avatar) {
                avatar.style.backgroundImage = `url('${TARGET_DATA.avatar}')`;
                avatar.setAttribute('aria-label', TARGET_DATA.realName);
                const link = avatar.closest('a');
                if (link) link.href = TARGET_DATA.profileUrl;
            }
            const nameContainer = item.querySelector('.fn-flex-1 .ft-smaller');
            if (nameContainer) {
                const link = nameContainer.querySelector('a');
                if (link) link.href = TARGET_DATA.profileUrl;
                const nameSpan = nameContainer.querySelector('span');
                if (nameSpan) {
                    nameSpan.innerText = `${TARGET_DATA.name}`;
                    nameSpan.style.cssText = TARGET_DATA.nameStyle;
                }
            }
        });
    }

    // =================================================================
    // 执行入口
    // =================================================================

    // 1. 尝试在个人主页注入按钮（会有延迟，所以等一下DOM）
    if (window.location.href.includes('/member/')) {
        setTimeout(injectStealButton, 500); // 延迟500ms确保DOM加载
        setTimeout(injectStealButton, 1500); // 多次尝试防止PJAX加载延迟
    }

    // 2. 立即执行替换
    processNode(document.body);

    // 3. 动态监听
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            // 检查是否需要在新加载的页面注入按钮 (PJAX跳转场景)
            if (window.location.href.includes('/member/')) {
                injectStealButton();
            }

            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        processNode(node);
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();