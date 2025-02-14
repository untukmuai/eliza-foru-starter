// controllers/imageController.js
import express from "express";
import { generateImage, generateCaption } from "@elizaos/core";

const router = express.Router();

const imageRoutes = (agents) => {
  router.post("/:agentId/image", async (req, res) => {
    const agentId = req.params.agentId;
    const agent = agents.get(agentId);
    if (!agent) {
      res.status(404).send("Agent not found");
      return;
    }
    const images = await generateImage({ ...req.body }, agent);
    const imagesRes = [];
    if (images.data && images.data.length > 0) {
      for (let i = 0; i < images.data.length; i++) {
        const caption = await generateCaption(
          { imageUrl: images.data[i] },
          agent
        );
        imagesRes.push({
          image: images.data[i],
          caption: caption.title,
        });
      }
    }
    res.json({ images: imagesRes });
  });
  return router;
}

export default imageRoutes;
