const puppeteer = require('puppeteer');
const dotenv = require('dotenv');

const db = require('./models');
dotenv.config();

const crawler = async () => {
  try {
    await db.sequelize.sync();
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--window-size=1920,1080', '--disable-notifications'],
      userDataDir: 'User_Data',
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 1080,
      height: 1080,
    });
    await page.goto('https://instagram.com');
    if (await page.$('a[href="/nutee.skhu.2020/"]')) {
      console.log('이미 로그인 되어 있습니다.');
    } else {
      await page.waitForSelector('input[name="username"]');
      await page.type('input[name="username"]', process.env.EMAIL);
      await page.type('input[name="password"]', process.env.PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      console.log('로그인을 완료했습니다.');
    }
    let result = [];
    let prevPostId = '';
    
    const newPost = await page.evaluate(() => {
        const article = document.querySelector('article:first-child');
        const postId = article.querySelector('.c-Yi7') && article.querySelector('.c-Yi7').href.split('/').slice(-2, -1)[0];
        const img = article.querySelector('.KL4Bh img') && article.querySelector('.KL4Bh img').src;
        return {
          postId, img,
        }
      });

      if (newPost.postId !== prevPostId) {
        console.log(newPost);
        if (!result.find((v) => v.postId === newPost.postId)) {
          const exist = await db.Instagram.findOne({ where: { postId: newPost.postId } });
          if (!exist) {
            result.push(newPost);
          }
        }
      }
      await page.waitFor(1000);

      prevPostId = newPost.postId;

      await page.waitFor(1000);
      
      await Promise.all(result.map((r) => {
        return db.Instagram.create({
          postId: r.postId,
          media: r.img,
        });
      }));

    console.log('성공');
    await page.close();
    await browser.close();
  } catch (e) {
    console.error(e);
  }
};

crawler();