const cloudinary = require("cloudinary");
const fetch = require("node-fetch");
const Downloader = require("nodejs-file-downloader");
const glob = require("glob");
const express = require("express");
require("dotenv").config();

const { CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const app = express();
app.use(express.json());

async function get_link_download(videoID) {
  const fetchAPI = await fetch(
    `https://youtube-mp36.p.rapidapi.com/dl?id=${videoID}`,
    {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.API_KEY,
        "x-rapidapi-host": process.env.API_HOST,
      },
    }
  );
  const fetchResponse = await fetchAPI.json();

  if (fetchResponse.status === "ok") {
    console.log(fetchResponse.link);
    return {
      success: true,
      song_title: fetchResponse.title,
      song_link: fetchResponse.link,
    };
  } else {
    return {
      success: false,
      message: fetchResponse.msg,
    };
  }
}



app.post("/UPLOAD", async (req, res) => {
  const videoID = await req.body.videoID;
  const link_download = await get_link_download(videoID);

  const downloader = new Downloader({
    url: link_download.song_link, //If the file name already exists, a new file with the name 200MB1.zip is created.
    directory: "./downloads", //This folder will be created, if it doesn't exist.
  });
  try {
    await downloader.download(); //Downloader.download() returns a promise.
    const data_thumbnail = await cloudinary.v2.uploader.upload(
      `https://img.youtube.com/vi/${videoID}/0.jpg`,
      { folder: "thumbnail" },
      function (error, result) {
        console.log(result, error);
        return result;
      }
    );
    glob(`./downloads/*${videoID}.mp3`, {}, async (err, files) => {
      const path = files[0];
      const data_music = await cloudinary.v2.uploader.upload(
        path,
        { resource_type: "video", folder: "music" },
        function (error, result) {
          console.log(result, error);
          return result;
        }
      );
      res.json({
        TitleSong: link_download.song_title,
        data_thumbnail,
        data_music,
      });
    });
  } catch (error) {
    //IMPORTANT: Handle a possible error. An error is thrown in case of network errors, or status codes of 400 and above.
    //Note that if the maxAttempts is set to higher than 1, the error is thrown only if all attempts fail.
    console.log("Upload failed", error);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});