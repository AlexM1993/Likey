const mongoose = require("mongoose");
const cities = require("./cities");
const { things, descriptors } = require("./seedHelpers")
const Like = require("../models/like");

mongoose.connect("mongodb://127.0.0.1/likey");
mongoose.set('strictQuery', false)

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => {
    console.log("Database connected");
});

const sample = (array) => array[Math.floor(Math.random() * array.length)]

const seedDB = async () => {
    await Like.deleteMany({});
    for (let i = 0; i < 50; i++){
        const random1000 = Math.floor(Math.random() * 1000);
        const likeditem = new Like({
            author: "645af923861ac84adcb87828",
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(things)}`,
            description: "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Perspiciatis iste ullam porro voluptatem incidunt provident similique sequi tempora! Optio modi atque repudiandae earum labore error laboriosam, saepe tempore quaerat quisquam?",
            images: [
                {
                  url: 'https://res.cloudinary.com/dfw5r9ex1/image/upload/v1684670337/Likey/c2izd0wc6hk2hjlonq9x.jpg',
                  filename: 'Likey/c2izd0wc6hk2hjlonq9x',
                },
                {
                  url: 'https://res.cloudinary.com/dfw5r9ex1/image/upload/v1684670337/Likey/l6ekdfe6invdh2xp0wdp.jpg',
                  filename: 'Likey/l6ekdfe6invdh2xp0wdp',
                },
                {
                  url: 'https://res.cloudinary.com/dfw5r9ex1/image/upload/v1684670337/Likey/tjqy0tny9lwhlk0idye1.jpg',
                  filename: 'Likey/tjqy0tny9lwhlk0idye1',
                }
              ]
        })
        await likeditem.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close()
})



// const seedDB = async () => {
//     await Like.deleteMany({});
//     for (let i = 0; i < 50; i++) {
//         const random1000 = Math.floor(Math.random() * 1000);
//         const likeditem = new Like({
//             location: `${cities[random1000].city}, ${cities[random1000].state}`,
//             title: `${sample(descriptors)} ${sample(things)}`
//         })
//         await likeditem.save();
//     }
// }



// seedDB().then(() => {
//     mongoose.connection.close();
// })

//.then(() => {mongoose.connection.close()
//})
