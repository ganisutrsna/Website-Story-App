import CONFIG from '../config';

const HomeModel = {
  async getStories(token) {
    const response = await fetch(`${CONFIG.BASE_URL}/stories?location=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await response.json();
    return json.listStory || [];
  },
};

export default HomeModel;
