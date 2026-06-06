import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { User } from '../modules/users/user.model.js';
import { Post } from '../modules/posts/post.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { AppConfig } from '../modules/admin/appConfig.model.js';
import { env } from '../config/env.js';

// ============================================================
// ArtNepalaya Database Seeder
// Usage: node src/scripts/seed.js [--clear]
// ============================================================

const CLEAR_DATA = process.argv.includes('--clear');

async function seed() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // ----------------------------------------------------------
    // Optional: Clear existing data
    // ----------------------------------------------------------
    if (CLEAR_DATA) {
      console.log('Clearing existing data...');
      await Promise.all([
        User.deleteMany({}),
        Post.deleteMany({}),
        Notification.deleteMany({}),
        AppConfig.deleteMany({})
      ]);
      console.log('All collections cleared.');
    }

    // ----------------------------------------------------------
    // 1. Create Super Admin
    // ----------------------------------------------------------
    console.log('\n--- Creating Super Admin ---');
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@artnepalaya.com' },
      {
        $set: {
          username: 'SuperAdmin',
          fullName: 'System Administrator',
          role: 'Admin',
          status: 'active',
          passwordHash: bcryptjs.hashSync('admin123', 10)
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`Admin created: ${adminUser.email} (${adminUser._id})`);

    // ----------------------------------------------------------
    // 2. Create Artist Profiles
    // ----------------------------------------------------------
    console.log('\n--- Creating Artist Profiles ---');

    const artistData = [
      {
        email: 'thangka@artnepalaya.com',
        username: 'thangka_master',
        fullName: 'Karma Lama',
        role: 'Artist',
        status: 'active',
        interests: ['traditional thangka', 'mandala', 'buddhist art'],
        stats: { followers: 1250, following: 48 },
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
      },
      {
        email: 'himalayan@artnepalaya.com',
        username: 'himalayan_visions',
        fullName: 'Srijana Shakya',
        role: 'Artist',
        status: 'active',
        interests: ['himalayan cyberpunk', 'digital fusion', 'contemporary nepal'],
        stats: { followers: 890, following: 112 },
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'
      },
      {
        email: 'kathmandu@artnepalaya.com',
        username: 'kathmandu_strokes',
        fullName: 'Bipin Sthapit',
        role: 'Artist',
        status: 'active',
        interests: ['nepali contemporary', 'street art', 'urban sketching'],
        stats: { followers: 2100, following: 75 },
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'
      }
    ];

    const artists = [];
    for (const data of artistData) {
      const artist = await User.findOneAndUpdate(
        { email: data.email },
        { $set: data },
        { upsert: true, new: true, runValidators: true }
      );
      artists.push(artist);
      console.log(`Artist created: ${artist.username} (${artist._id})`);
    }

    // ----------------------------------------------------------
    // 3. Create Posts (18 posts distributed among 3 artists)
    // ----------------------------------------------------------
    console.log('\n--- Creating Posts ---');

    const postData = [
      // Artist 1: thangka_master (6 posts)
      {
        artistIndex: 0,
        caption: 'Intricate mandala work representing the cosmic wheel of existence. Each stroke a meditation, each color a prayer.',
        tags: ['traditional thangka', 'mandala', 'buddhist art'],
        mediaCount: 2
      },
      {
        artistIndex: 0,
        caption: 'Green Tara thangka painting following traditional Newari iconographic measurements. 22-karat gold leaf detailing on the crown.',
        tags: ['traditional thangka', 'buddhist art', 'newari art'],
        mediaCount: 1
      },
      {
        artistIndex: 0,
        caption: 'Wheel of Life depicting the six realms of existence. Natural mineral pigments on cotton canvas.',
        tags: ['traditional thangka', 'buddhist art', 'paubha painting'],
        mediaCount: 3
      },
      {
        artistIndex: 0,
        caption: 'Thousand-armed Avalokiteshvara. Three months of devotion condensed onto a single canvas.',
        tags: ['traditional thangka', 'mandala', 'buddhist art'],
        mediaCount: 1
      },
      {
        artistIndex: 0,
        caption: 'Detail study of lotus throne patterns from 15th century Nepali manuscripts. Preservation through recreation.',
        tags: ['traditional thangka', 'newari art', 'paubha painting'],
        mediaCount: 2
      },
      {
        artistIndex: 0,
        caption: 'Sacred geometry exploration: the Sri Yantra rendered in traditional mineral pigments on hand-prepared canvas.',
        tags: ['mandala', 'traditional thangka', 'buddhist art'],
        mediaCount: 1
      },
      // Artist 2: himalayan_visions (6 posts)
      {
        artistIndex: 1,
        caption: 'Himalayan peaks meet neon cityscapes in this cyberpunk fusion. Kathmandu 2077.',
        tags: ['himalayan cyberpunk', 'digital fusion', 'contemporary nepal'],
        mediaCount: 1
      },
      {
        artistIndex: 1,
        caption: 'Digital reimagining of Swayambhunath stupa as a floating data temple in the cloud networks of tomorrow.',
        tags: ['himalayan cyberpunk', 'digital fusion', 'nepali contemporary'],
        mediaCount: 2
      },
      {
        artistIndex: 1,
        caption: 'Rani Pokhari reflection series. Traditional architecture through the lens of generative algorithms.',
        tags: ['digital fusion', 'contemporary nepal', 'nepali contemporary'],
        mediaCount: 1
      },
      {
        artistIndex: 1,
        caption: 'Cyber Kumari: merging the living goddess tradition with AI portraiture. Commentary on tradition in the digital age.',
        tags: ['himalayan cyberpunk', 'digital fusion', 'contemporary nepal'],
        mediaCount: 3
      },
      {
        artistIndex: 1,
        caption: 'Neon prayer flags catching digital winds above the Thamel skyline. Augmented reality series part 3.',
        tags: ['himalayan cyberpunk', 'digital fusion', 'nepali contemporary'],
        mediaCount: 1
      },
      {
        artistIndex: 1,
        caption: 'Boudhanath mandala reimagined as a circuit board. Where ancient wisdom meets modern connectivity.',
        tags: ['himalayan cyberpunk', 'mandala', 'digital fusion'],
        mediaCount: 2
      },
      // Artist 3: kathmandu_strokes (6 posts)
      {
        artistIndex: 2,
        caption: 'Morning chai session at a Patan square tea shop. Quick urban sketch capturing the everyday sacred.',
        tags: ['urban sketching', 'street art', 'nepali contemporary'],
        mediaCount: 1
      },
      {
        artistIndex: 2,
        caption: 'Ason market chaos: layers of color, sound, and spice translated onto concrete walls.',
        tags: ['street art', 'nepali contemporary', 'urban sketching'],
        mediaCount: 2
      },
      {
        artistIndex: 2,
        caption: 'Durbar Square restoration project documentation. Sketching what remains and what is being rebuilt.',
        tags: ['urban sketching', 'nepali contemporary', 'newari art'],
        mediaCount: 1
      },
      {
        artistIndex: 2,
        caption: 'Bhaktapur alleyway series. Finding the extraordinary in worn brick and ancient timber.',
        tags: ['urban sketching', 'street art', 'nepali contemporary'],
        mediaCount: 3
      },
      {
        artistIndex: 2,
        caption: 'Large-scale mural in Thamel: bridging ancient Newari patterns with contemporary street aesthetics.',
        tags: ['street art', 'newari art', 'nepali contemporary'],
        mediaCount: 2
      },
      {
        artistIndex: 2,
        caption: 'Rickshaw driver portrait series. The unsung artists of Kathmandu streets, drawn in ink and watercolor.',
        tags: ['urban sketching', 'nepali contemporary', 'street art'],
        mediaCount: 1
      }
    ];

    const createdPosts = [];
    for (let i = 0; i < postData.length; i++) {
      const p = postData[i];
      const authorId = artists[p.artistIndex]._id;

      // Generate media array
      const media = [];
      for (let m = 0; m < p.mediaCount; m++) {
        media.push({
          url: `https://picsum.photos/seed/artnepalaya_${i}_${m}/1080/1350`,
          providerId: `seed_post_${i}_${m}`,
          type: 'image'
        });
      }

      // Random realistic engagement metrics
      const likesCount = Math.floor(Math.random() * 345) + 5;   // 5 - 350
      const savesCount = Math.floor(Math.random() * 118) + 2;   // 2 - 120

      const post = await Post.create({
        authorId,
        media,
        caption: p.caption,
        tags: p.tags,
        isHumanMade: true,
        likesCount,
        savesCount
      });
      createdPosts.push(post);
    }
    console.log(`${createdPosts.length} posts created.`);

    // ----------------------------------------------------------
    // 4. Create Notifications
    // ----------------------------------------------------------
    console.log('\n--- Creating Notifications ---');

    const notifications = [
      {
        recipientId: artists[0]._id,
        senderId: artists[1]._id,
        postId: createdPosts[0]._id,
        type: 'Like',
        message: null,
        isRead: false
      },
      {
        recipientId: artists[0]._id,
        senderId: artists[2]._id,
        postId: createdPosts[1]._id,
        type: 'Save',
        message: null,
        isRead: false
      },
      {
        recipientId: artists[1]._id,
        senderId: artists[0]._id,
        postId: createdPosts[6]._id,
        type: 'Like',
        message: null,
        isRead: true
      },
      {
        recipientId: artists[2]._id,
        senderId: artists[1]._id,
        postId: createdPosts[12]._id,
        type: 'Like',
        message: null,
        isRead: false
      },
      {
        recipientId: artists[1]._id,
        senderId: artists[2]._id,
        postId: createdPosts[7]._id,
        type: 'Save',
        message: null,
        isRead: true
      },
      {
        recipientId: artists[0]._id,
        senderId: null,
        postId: null,
        type: 'System',
        message: 'Welcome to ArtNepalaya! Start exploring Nepali art.',
        isRead: false
      },
      {
        recipientId: artists[1]._id,
        senderId: null,
        postId: null,
        type: 'System',
        message: 'Welcome to ArtNepalaya! Start exploring Nepali art.',
        isRead: false
      },
      {
        recipientId: artists[2]._id,
        senderId: null,
        postId: null,
        type: 'System',
        message: 'Your profile is now live! Share your first masterpiece with the community.',
        isRead: true
      }
    ];

    await Notification.insertMany(notifications);
    console.log(`${notifications.length} notifications created.`);

    // ----------------------------------------------------------
    // 5. Create AppConfig: Auth Background Media
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
            { url: 'https://images.unsplash.com/photo-1609766856923-7e0a9a5d1c1c?w=1080', type: 'image' }
          ],
          updatedBy: adminUser._id
        }
      },
      { upsert: true, new: true }
    );
    console.log('AppConfig auth_background_media created.');

    // ----------------------------------------------------------
    // Summary
    // ----------------------------------------------------------
    console.log('\n============================');
    console.log('Seed completed successfully!');
    console.log('============================');
    console.log(`  Admin:         1 (${adminUser.email})`);
    console.log(`  Artists:       ${artists.length}`);
    console.log(`  Posts:         ${createdPosts.length}`);
    console.log(`  Notifications: ${notifications.length}`);
    console.log(`  AppConfig:     1 (auth_background_media)`);
    console.log('============================\n');

  } catch (error) {
    console.error('Seed failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

seed();
