import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { User } from '../modules/users/user.model.js';
import { Post } from '../modules/posts/post.model.js';
import { Report } from '../modules/reports/report.model.js';
import { FeaturedPost } from '../modules/admin/featured.model.js';
import { AppConfig } from '../modules/admin/appConfig.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { CmsPage } from '../modules/admin/cmsPage.model.js';
import { GlobalPopup } from '../modules/admin/globalPopup.model.js';
import { env } from '../config/env.js';

// ============================================================
// ArtNepalaya MEGA Seeder
// Usage: node src/scripts/seedAll.js [--clear]
// Creates 56 users, 110 posts, 25 reports, featured posts, and app config
// ============================================================

const CLEAR_DATA = process.argv.includes('--clear');

// ---------- Data Pools ----------

const INTERESTS_POOL = [
  'thangka painting', 'mandala art', 'paubha', 'contemporary nepali',
  'digital art', 'street art', 'sculpture', 'pottery',
  'woodcarving', 'metalwork', 'watercolor', 'oil painting',
  'mixed media', 'photography', 'textile art', 'buddhist art',
  'hindu art', 'newari art', 'himalayan landscape', 'abstract'
];

const REPORT_REASONS = [
  'Nudity', 'Fake/Misleading', 'Unmarked AI Content',
  'Illegal Items', 'Spam', 'Harassment',
  'Copyright Violation', 'Other'
];

const CAPTION_TEMPLATES = [
  'Exploring the depths of Nepali artistic traditions through a modern lens.',
  'Each brushstroke carries the weight of centuries of Himalayan heritage.',
  'Morning light in the studio, working on a new piece inspired by Kathmandu Valley.',
  'Traditional techniques meet contemporary expression in this latest work.',
  'Inspired by the ancient pagoda architecture of Bhaktapur.',
  'Color study: the vibrant hues of Holi festival translated onto canvas.',
  'Meditation in motion - letting the art flow through ancestral memory.',
  'New series exploring the intersection of sacred geometry and modern design.',
  'Capturing the spirit of Indra Jatra through mixed media.',
  'Work in progress: large-scale mural depicting the Kumari tradition.',
  'Finding beauty in the everyday textures of Patan Durbar Square.',
  'Experimenting with natural mineral pigments sourced from the Himalayas.',
  'This piece took three weeks of devotion. Every detail matters.',
  'Revisiting the Newari woodcarving patterns in a fresh contemporary context.',
  'Dawn over Pokhara - translating that golden light into art.',
  'Studio visit today! Come see the new collection before the gallery showing.',
  'Grateful for the rich artistic lineage of Nepal that inspires daily.',
  'Abstract interpretation of the monsoon clouds rolling over Annapurna.',
  'Collaboration piece with a local metalworker. Fusion of craft and fine art.',
  'Teaching traditional techniques to the next generation at the community workshop.',
  'The stories woven into Dhaka fabric inspire this textile-based installation.',
  'Sketching at Boudhanath - the energy here is unmatched.',
  'Finished commission: a contemporary take on the Wheel of Life.',
  'Exploring negative space through the lens of Buddhist philosophy.',
  'Latest gallery addition celebrating the potters of Thimi.',
  'Digital rendering of Swayambhunath at twilight. Sacred spaces reimagined.',
  'Watercolor series documenting the changing skyline of Kathmandu.',
  'Art is the bridge between our ancient past and limitless future.',
  'Fresh off the easel - oil painting inspired by Terai landscapes.',
  'Collaborative mural project in Thamel is finally complete!'
];

// ---------- Helpers ----------

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateAvatarUrl(username) {
  return `https://i.pravatar.cc/200?u=${username}`;
}

// Static Unsplash CDN image URLs (art-themed) to replace unreliable picsum.photos
const UNSPLASH_ART_IDS = [
  '1579783902614-a3fb3927b6a5',
  '1578926288018-1b09fdfa5eb6',
  '1513364776144-60967b0f800f',
  '1547891654-e66ed7ebb968',
  '1460661419201-fd4cecdf8a8b',
  '1549887534-1541e9326642',
  '1578321272176-b7bbc0679853',
  '1558618666-fcd25c85f82e',
  '1544735716-392fe2489ffa',
  '1565017386257-337e10db93e7'
];

let _unsplashIndex = 0;
function getNextArtImageUrl() {
  const id = UNSPLASH_ART_IDS[_unsplashIndex % UNSPLASH_ART_IDS.length];
  _unsplashIndex++;
  return `https://images.unsplash.com/photo-${id}?w=1080&q=80`;
}

// ---------- User Definitions ----------

function buildArtistUsers() {
  const artistNames = [
    { username: 'thangka_master', fullName: 'Karma Lama' },
    { username: 'himalayan_visions', fullName: 'Srijana Shakya' },
    { username: 'kathmandu_strokes', fullName: 'Bipin Sthapit' },
    { username: 'paubha_painter', fullName: 'Deepak Chitrakar' },
    { username: 'mandala_monk', fullName: 'Tenzin Norbu' },
    { username: 'newari_craft', fullName: 'Rajesh Shrestha' },
    { username: 'color_of_nepal', fullName: 'Anita Tamang' },
    { username: 'sacred_strokes', fullName: 'Pasang Sherpa' },
    { username: 'valley_artist', fullName: 'Sabina Maharjan' },
    { username: 'himalayan_hues', fullName: 'Dorje Gurung' },
    { username: 'pagoda_dreams', fullName: 'Nisha Joshi' },
    { username: 'abstract_nepal', fullName: 'Roshan Karki' },
    { username: 'canvas_kathmandu', fullName: 'Pratima Dangol' },
    { username: 'brush_bharatpur', fullName: 'Sunil Thapa' },
    { username: 'artisan_pokhara', fullName: 'Maya Pun' },
    { username: 'clay_and_soul', fullName: 'Bikram Prajapati' },
    { username: 'ink_himalaya', fullName: 'Laxmi Rai' },
    { username: 'modern_mandala', fullName: 'Arun Bajracharya' },
    { username: 'nepali_impressions', fullName: 'Kamala Thapa Magar' },
    { username: 'silk_and_stone', fullName: 'Pemba Tamang' }
  ];

  return artistNames.map(a => ({
    email: `${a.username}@artnepalaya.com`,
    username: a.username,
    fullName: a.fullName,
    role: 'Artist',
    status: 'active',
    interests: pickRandom(INTERESTS_POOL, randomInt(3, 6)),
    stats: { followers: randomInt(50, 3000), following: randomInt(10, 200) },
    avatarUrl: generateAvatarUrl(a.username),
    isAdult: true
  }));
}

function buildGalleryUsers() {
  const galleryNames = [
    { username: 'kathmandu_gallery', fullName: 'Kathmandu Art Gallery' },
    { username: 'patan_arts', fullName: 'Patan Arts Center' },
    { username: 'himalayan_gallery', fullName: 'Himalayan Fine Arts' },
    { username: 'nepal_art_house', fullName: 'Nepal Art House' },
    { username: 'siddhartha_gallery', fullName: 'Siddhartha Gallery' },
    { username: 'thamel_gallery', fullName: 'Thamel Art Space' },
    { username: 'boudha_arts', fullName: 'Boudha Contemporary Arts' },
    { username: 'nepali_canvas', fullName: 'Nepali Canvas Gallery' },
    { username: 'everest_gallery', fullName: 'Everest Art Gallery' },
    { username: 'durbar_arts', fullName: 'Durbar Square Arts' }
  ];

  return galleryNames.map(g => ({
    email: `${g.username}@artnepalaya.com`,
    username: g.username,
    fullName: g.fullName,
    role: 'Business',
    subRoles: ['Gallery'],
    status: 'active',
    interests: pickRandom(INTERESTS_POOL, randomInt(3, 5)),
    stats: { followers: randomInt(100, 5000), following: randomInt(20, 150) },
    avatarUrl: generateAvatarUrl(g.username),
    isAdult: true
  }));
}

function buildBusinessUsers() {
  const businessNames = [
    { username: 'art_supplies_ktm', fullName: 'Kathmandu Art Supplies', subRole: 'Art Supply' },
    { username: 'color_shop_patan', fullName: 'Color Shop Patan', subRole: 'Art Supply' },
    { username: 'brush_depot', fullName: 'Brush Depot Nepal', subRole: 'Art Supply' },
    { username: 'frame_masters', fullName: 'Frame Masters', subRole: 'Framing' },
    { username: 'golden_frames', fullName: 'Golden Frames Nepal', subRole: 'Framing' },
    { username: 'heritage_frames', fullName: 'Heritage Frame Studio', subRole: 'Framing' },
    { username: 'print_nepal', fullName: 'Print Nepal', subRole: 'Print Shop' },
    { username: 'art_prints_ktm', fullName: 'Art Prints Kathmandu', subRole: 'Print Shop' },
    { username: 'canvas_prints_np', fullName: 'Canvas Prints Nepal', subRole: 'Print Shop' },
    { username: 'pigment_house', fullName: 'Pigment House Nepal', subRole: 'Art Supply' }
  ];

  return businessNames.map(b => ({
    email: `${b.username}@artnepalaya.com`,
    username: b.username,
    fullName: b.fullName,
    role: 'Business',
    subRoles: [b.subRole],
    status: 'active',
    interests: pickRandom(INTERESTS_POOL, randomInt(2, 4)),
    stats: { followers: randomInt(30, 1500), following: randomInt(5, 80) },
    avatarUrl: generateAvatarUrl(b.username),
    isAdult: true
  }));
}

function buildArtLoverUsers() {
  const loverNames = [
    { username: 'art_fan_01', fullName: 'Ram Prasad' },
    { username: 'collector_nepal', fullName: 'Sunita Koirala' },
    { username: 'art_enthusiast', fullName: 'Binod Chaudhary' },
    { username: 'gallery_hopper', fullName: 'Priya Sharma' },
    { username: 'culture_seeker', fullName: 'Hari Bahadur' },
    { username: 'canvas_lover', fullName: 'Gita Adhikari' },
    { username: 'art_wanderer', fullName: 'Dipesh Khadka' },
    { username: 'creative_soul', fullName: 'Mina Bhandari' },
    { username: 'art_admirer_np', fullName: 'Santosh Devkota' },
    { username: 'culture_buff', fullName: 'Prabha Rana' },
    { username: 'art_patron', fullName: 'Bijay Lama' },
    { username: 'visual_explorer', fullName: 'Sarita Thapa' },
    { username: 'nepali_art_fan', fullName: 'Kiran Basnet' },
    { username: 'museum_walker', fullName: 'Reshma Tuladhar' },
    { username: 'paint_admirer', fullName: 'Anil Manandhar' }
  ];

  return loverNames.map(l => ({
    email: `${l.username}@artnepalaya.com`,
    username: l.username,
    fullName: l.fullName,
    role: 'Art Lover',
    status: 'active',
    interests: pickRandom(INTERESTS_POOL, randomInt(2, 5)),
    stats: { followers: randomInt(5, 500), following: randomInt(10, 300) },
    avatarUrl: generateAvatarUrl(l.username),
    isAdult: true
  }));
}

// ---------- Post Generation ----------

function generatePosts(artists, galleries) {
  const posts = [];
  const authors = [...artists, ...galleries];
  const videoUrl = 'https://res.cloudinary.com/demo/video/upload/v1/samples/sea-turtle.mp4';
  let captionIndex = 0;

  for (let i = 0; i < 110; i++) {
    const authorIndex = i % authors.length;
    const isVideo = i >= 85; // first 85 are images, last 25 are videos
    const mediaCount = randomInt(1, 3);
    const media = [];

    for (let m = 0; m < mediaCount; m++) {
      if (isVideo && m === 0) {
        media.push({
          url: videoUrl,
          providerId: `seed_video_${i}_${m}`,
          type: 'video'
        });
      } else {
        media.push({
          url: getNextArtImageUrl(),
          providerId: `seed_img_${i}_${m}`,
          type: 'image'
        });
      }
    }

    const tagCount = randomInt(2, 4);
    const tags = pickRandom(INTERESTS_POOL, tagCount);
    const caption = CAPTION_TEMPLATES[captionIndex % CAPTION_TEMPLATES.length];
    captionIndex++;

    posts.push({
      authorId: authors[authorIndex]._id,
      media,
      caption,
      tags,
      isHumanMade: true,
      isNsfw: i % 10 === 9,
      likesCount: randomInt(5, 500),
      savesCount: randomInt(2, 150)
    });
  }

  return posts;
}

// ---------- Report Generation ----------

function generateReports(users, posts, adminId) {
  const reports = [];
  const allUserIds = users.map(u => u._id);
  const allPostIds = posts.map(p => p._id);

  for (let i = 0; i < 25; i++) {
    const isPostTarget = i % 3 !== 0; // roughly 2/3 are Post reports
    const reporterIndex = randomInt(0, allUserIds.length - 1);
    let targetId;
    let targetType;

    if (isPostTarget) {
      targetType = 'Post';
      targetId = allPostIds[randomInt(0, allPostIds.length - 1)];
    } else {
      targetType = 'User';
      // pick a different user than the reporter
      let targetIndex = randomInt(0, allUserIds.length - 1);
      while (targetIndex === reporterIndex) {
        targetIndex = randomInt(0, allUserIds.length - 1);
      }
      targetId = allUserIds[targetIndex];
    }

    let status;
    let resolvedBy = null;
    if (i < 15) {
      status = 'Pending';
    } else if (i < 20) {
      status = 'Resolved';
      resolvedBy = adminId;
    } else {
      status = 'Dismissed';
      resolvedBy = adminId;
    }

    reports.push({
      reporterId: allUserIds[reporterIndex],
      targetType,
      targetId,
      reason: REPORT_REASONS[i % REPORT_REASONS.length],
      details: `Automated seed report #${i + 1} for testing purposes.`,
      status,
      resolvedBy
    });
  }

  return reports;
}

// ---------- Main Seed Function ----------

async function seedAll() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // ----------------------------------------------------------
    // Optional: Clear existing data
    // ----------------------------------------------------------
    if (CLEAR_DATA) {
      console.log('\nClearing all existing data...');
      await Promise.all([
        User.deleteMany({}),
        Post.deleteMany({}),
        Report.deleteMany({}),
        FeaturedPost.deleteMany({}),
        AppConfig.deleteMany({}),
        Notification.deleteMany({}),
        CmsPage.deleteMany({}),
        GlobalPopup.deleteMany({})
      ]);
      console.log('All collections cleared.');
    }

    // ----------------------------------------------------------
    // 1. Create Admin User
    // ----------------------------------------------------------
    console.log('\n--- Creating Admin User ---');
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.warn('\x1b[33m⚠ WARNING: Using default admin password. Set SEED_ADMIN_PASSWORD env var for production.\x1b[0m');
    }
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@artnepalaya.com' },
      {
        $set: {
          username: 'SuperAdmin',
          fullName: 'System Administrator',
          role: 'Admin',
          status: 'active',
          passwordHash: bcryptjs.hashSync(adminPassword, 10),
          avatarUrl: generateAvatarUrl('SuperAdmin'),
          stats: { followers: 0, following: 0 },
          isAdult: true
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`Admin created: ${adminUser.email} (${adminUser._id})`);

    // ----------------------------------------------------------
    // 2. Create Artists (20)
    // ----------------------------------------------------------
    console.log('\n--- Creating 20 Artist Profiles ---');
    const artistData = buildArtistUsers();
    const artists = [];
    for (const data of artistData) {
      const user = await User.findOneAndUpdate(
        { email: data.email },
        { $set: data },
        { upsert: true, new: true, runValidators: true }
      );
      artists.push(user);
    }
    console.log(`${artists.length} artists created.`);

    // ----------------------------------------------------------
    // 3. Create Galleries (10)
    // ----------------------------------------------------------
    console.log('\n--- Creating 10 Gallery Profiles ---');
    const galleryData = buildGalleryUsers();
    const galleries = [];
    for (const data of galleryData) {
      const user = await User.findOneAndUpdate(
        { email: data.email },
        { $set: data },
        { upsert: true, new: true, runValidators: true }
      );
      galleries.push(user);
    }
    console.log(`${galleries.length} galleries created.`);

    // ----------------------------------------------------------
    // 4. Create Businesses (10)
    // ----------------------------------------------------------
    console.log('\n--- Creating 10 Business Profiles ---');
    const businessData = buildBusinessUsers();
    const businesses = [];
    for (const data of businessData) {
      const user = await User.findOneAndUpdate(
        { email: data.email },
        { $set: data },
        { upsert: true, new: true, runValidators: true }
      );
      businesses.push(user);
    }
    console.log(`${businesses.length} businesses created.`);

    // ----------------------------------------------------------
    // 5. Create Art Lovers (15)
    // ----------------------------------------------------------
    console.log('\n--- Creating 15 Art Lover Profiles ---');
    const artLoverData = buildArtLoverUsers();
    const artLovers = [];
    for (const data of artLoverData) {
      const user = await User.findOneAndUpdate(
        { email: data.email },
        { $set: data },
        { upsert: true, new: true, runValidators: true }
      );
      artLovers.push(user);
    }
    console.log(`${artLovers.length} art lovers created.`);

    const allUsers = [adminUser, ...artists, ...galleries, ...businesses, ...artLovers];

    // ----------------------------------------------------------
    // 6. Create Posts (110)
    // ----------------------------------------------------------
    console.log('\n--- Creating 110 Posts ---');
    const postData = generatePosts(artists, galleries);
    const createdPosts = await Post.insertMany(postData);
    console.log(`${createdPosts.length} posts created.`);

    // ----------------------------------------------------------
    // 7. Create Reports (25)
    // ----------------------------------------------------------
    console.log('\n--- Creating 25 Reports ---');
    const reportData = generateReports(allUsers, createdPosts, adminUser._id);
    const createdReports = await Report.insertMany(reportData);
    console.log(`${createdReports.length} reports created.`);

    // ----------------------------------------------------------
    // 8. Create Featured Posts (3)
    // ----------------------------------------------------------
    console.log('\n--- Creating 3 Featured Posts ---');
    // Pick 3 posts from different authors
    const featuredCandidates = [];
    const usedAuthors = new Set();
    for (const post of createdPosts) {
      const authorStr = post.authorId.toString();
      if (!usedAuthors.has(authorStr)) {
        usedAuthors.add(authorStr);
        featuredCandidates.push(post);
      }
      if (featuredCandidates.length >= 3) break;
    }

    for (const post of featuredCandidates) {
      await FeaturedPost.findOneAndUpdate(
        { postId: post._id },
        { $set: { postId: post._id, featuredBy: adminUser._id } },
        { upsert: true, new: true }
      );
    }
    console.log(`${featuredCandidates.length} featured posts created.`);

    // ----------------------------------------------------------
    // 9. Create AppConfig: auth_background_media
    // ----------------------------------------------------------
    console.log('\n--- Creating AppConfig ---');
    await AppConfig.findOneAndUpdate(
      { key: 'auth_background_media' },
      {
        $set: {
          key: 'auth_background_media',
          value: [
            { url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1080', type: 'image' },
            { url: 'https://images.unsplash.com/photo-1565017386257-337e10db93e7?w=1080', type: 'image' },
            { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1080', type: 'image' },
            { url: 'https://images.unsplash.com/photo-1609766856923-7e0a9a5d1c1c?w=1080', type: 'image' },
            { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080', type: 'image' }
          ],
          updatedBy: adminUser._id
        }
      },
      { upsert: true, new: true }
    );
    console.log('AppConfig auth_background_media created (5 images).');

    // ----------------------------------------------------------
    // 10. Create Notifications (18)
    // ----------------------------------------------------------
    console.log('\n--- Creating 18 Notifications ---');
    const notifications = [
      // 5 Like notifications
      { senderId: artists[1]._id, recipientId: artists[0]._id, postId: createdPosts[0]._id, type: 'Like', message: `${artists[1].username} liked your post`, isRead: false },
      { senderId: artists[2]._id, recipientId: galleries[0]._id, postId: createdPosts[5]._id, type: 'Like', message: `${artists[2].username} liked your post`, isRead: false },
      { senderId: artLovers[0]._id, recipientId: artists[3]._id, postId: createdPosts[10]._id, type: 'Like', message: `${artLovers[0].username} liked your post`, isRead: true },
      { senderId: galleries[1]._id, recipientId: artists[4]._id, postId: createdPosts[15]._id, type: 'Like', message: `${galleries[1].username} liked your post`, isRead: false },
      { senderId: artLovers[2]._id, recipientId: galleries[2]._id, postId: createdPosts[20]._id, type: 'Like', message: `${artLovers[2].username} liked your post`, isRead: true },
      // 3 Save notifications
      { senderId: artLovers[1]._id, recipientId: artists[0]._id, postId: createdPosts[2]._id, type: 'Save', message: `${artLovers[1].username} saved your artwork`, isRead: false },
      { senderId: artists[5]._id, recipientId: artists[1]._id, postId: createdPosts[7]._id, type: 'Save', message: `${artists[5].username} saved your artwork`, isRead: true },
      { senderId: artLovers[3]._id, recipientId: galleries[1]._id, postId: createdPosts[12]._id, type: 'Save', message: `${artLovers[3].username} saved your artwork`, isRead: false },
      // 4 Follow notifications
      { senderId: artLovers[0]._id, recipientId: artists[2]._id, postId: null, type: 'Follow', message: `${artLovers[0].username} started following you`, isRead: false },
      { senderId: artLovers[1]._id, recipientId: artists[3]._id, postId: null, type: 'Follow', message: `${artLovers[1].username} started following you`, isRead: true },
      { senderId: artists[6]._id, recipientId: galleries[0]._id, postId: null, type: 'Follow', message: `${artists[6].username} started following you`, isRead: false },
      { senderId: artLovers[2]._id, recipientId: artLovers[3]._id, postId: null, type: 'Follow', message: `${artLovers[2].username} started following you`, isRead: true },
      // 3 AdminBroadcast notifications
      { senderId: null, recipientId: artists[0]._id, postId: null, type: 'AdminBroadcast', title: 'Platform Update', message: 'We have released new community guidelines. Please review them in your settings.', isRead: false },
      { senderId: null, recipientId: galleries[0]._id, postId: null, type: 'AdminBroadcast', title: 'Platform Update', message: 'Exciting news! Gallery verification badges are now available for eligible accounts.', isRead: false },
      { senderId: null, recipientId: artLovers[0]._id, postId: null, type: 'AdminBroadcast', title: 'Platform Update', message: 'ArtNepalaya beta feedback survey is now live. Share your thoughts!', isRead: true },
      // 3 System notifications
      { senderId: null, recipientId: artists[1]._id, postId: null, type: 'System', message: 'Your profile has been verified. You can now access premium features.', isRead: false },
      { senderId: null, recipientId: artLovers[1]._id, postId: null, type: 'System', message: 'Welcome to ArtNepalaya! Complete your profile to get personalized recommendations.', isRead: true },
      { senderId: null, recipientId: galleries[2]._id, postId: null, type: 'System', message: 'Your gallery listing has been approved and is now visible to the community.', isRead: false }
    ];
    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`${createdNotifications.length} notifications created.`);

    // ----------------------------------------------------------
    // 11. Create CMS Pages (4)
    // ----------------------------------------------------------
    console.log('\n--- Creating 4 CMS Pages ---');
    const cmsPages = [
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        content: '<h1>Privacy Policy</h1><p>Last updated: January 2025</p><p>ArtNepalaya ("we", "our", "us") is committed to protecting your personal information...</p><h2>Information We Collect</h2><p>We collect information you provide directly: name, email, profile details, artwork uploads, and interaction data.</p><h2>How We Use Your Information</h2><p>We use your data to provide and improve the platform, personalize your experience, and communicate updates.</p><h2>Data Sharing</h2><p>We do not sell your personal information. We may share data with service providers who assist in platform operations.</p><h2>Your Rights</h2><p>You can access, update, or delete your account data at any time through your profile settings.</p>'
      },
      {
        slug: 'about-us',
        title: 'About Us',
        content: '<h1>About ArtNepalaya</h1><p>ArtNepalaya is Nepal\'s premier digital platform for artists, galleries, and art enthusiasts.</p><h2>Our Mission</h2><p>To celebrate, preserve, and promote Nepali art by connecting creators with a global community of art lovers.</p><h2>What We Offer</h2><p>A vibrant social platform for sharing artwork, discovering new artists, and supporting the Nepali art ecosystem.</p><h2>Our Community</h2><p>From traditional Thangka painters to contemporary digital artists, ArtNepalaya is home to Nepal\'s most diverse artistic community.</p>'
      },
      {
        slug: 'terms-conditions',
        title: 'Terms & Conditions',
        content: '<h1>Terms & Conditions</h1><p>Last updated: January 2025</p><p>By using ArtNepalaya, you agree to these terms.</p><h2>Account Responsibilities</h2><p>You are responsible for maintaining the security of your account and all activities under it.</p><h2>Content Policy</h2><p>All artwork must be human-created. AI-generated content is strictly prohibited. Users must declare originality.</p><h2>Prohibited Content</h2><p>Illegal content, harassment, spam, and copyright-infringing material will be removed and may result in account suspension.</p><h2>Intellectual Property</h2><p>Artists retain ownership of their uploaded work. By posting, you grant ArtNepalaya a license to display the content on the platform.</p>'
      },
      {
        slug: 'community-guidelines',
        title: 'Community Guidelines',
        content: '<h1>Community Guidelines</h1><p>ArtNepalaya is a respectful space for artistic expression.</p><h2>Be Respectful</h2><p>Treat all community members with dignity. Harassment, hate speech, and discrimination are not tolerated.</p><h2>Original Work Only</h2><p>Post only artwork you have created. AI-generated images are not permitted. Always credit collaborators.</p><h2>Mark Sensitive Content</h2><p>If your artwork contains nudity or mature themes, use the 18+ toggle during upload.</p><h2>Report Violations</h2><p>Help us maintain a safe community by reporting content that violates these guidelines.</p><h2>Consequences</h2><p>Violations may result in content removal, temporary suspension, or permanent banning depending on severity.</p>'
      }
    ];

    for (const page of cmsPages) {
      await CmsPage.findOneAndUpdate(
        { slug: page.slug },
        { $set: { ...page, updatedBy: adminUser._id } },
        { upsert: true, new: true }
      );
    }
    console.log(`${cmsPages.length} CMS pages created.`);

    // ----------------------------------------------------------
    // 12. Create Global Popup (1)
    // ----------------------------------------------------------
    console.log('\n--- Creating Global Popup ---');
    await GlobalPopup.findOneAndUpdate(
      {},
      {
        $set: {
          heading: 'Welcome to ArtNepalaya Beta!',
          icon: 'celebration',
          body: 'We are thrilled to have you as part of our beta community. Your feedback helps us build the best platform for Nepali artists. Take a moment to share your thoughts!',
          ctaText: 'Take Survey',
          ctaLink: 'https://forms.example.com/beta-feedback',
          isActive: true,
          updatedBy: adminUser._id
        }
      },
      { upsert: true, new: true }
    );
    console.log('Global Popup created (Active).');

    // ----------------------------------------------------------
    // Summary
    // ----------------------------------------------------------
    console.log('\n============================================');
    console.log('  MEGA SEED COMPLETED SUCCESSFULLY');
    console.log('============================================');
    console.log(`  Admin:          1 (${adminUser.email})`);
    console.log(`  Artists:        ${artists.length}`);
    console.log(`  Galleries:      ${galleries.length}`);
    console.log(`  Businesses:     ${businesses.length}`);
    console.log(`  Art Lovers:     ${artLovers.length}`);
    console.log(`  Total Users:    ${allUsers.length}`);
    console.log('  ---');
    console.log(`  Posts:          ${createdPosts.length}`);
    console.log(`  Reports:        ${createdReports.length}`);
    console.log(`  Featured Posts: ${featuredCandidates.length}`);
    console.log(`  AppConfig:      1 (auth_background_media)`);
    console.log(`  Notifications:  ${createdNotifications.length}`);
    console.log(`  CMS Pages:      ${cmsPages.length}`);
    console.log(`  Global Popup:   1 (Active)`);
    console.log('============================================\n');

  } catch (error) {
    console.error('Mega seed failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

seedAll();
