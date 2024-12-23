const { prisma } = require("../prisma/prisma-client");
const bcrypt = require("bcryptjs");
const jdenticon = require("jdenticon");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const UserController = {
    register: async (req, res) => {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: "All fields are required!" });
        }

        try {
            const existingUser = await prisma.user.findUnique({ where: { email } });

            if (existingUser) {
                return res.status(400).json({ error: "User already exists!" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const png = jdenticon.toPng(name, 200);
            const avatarName = `${name}_${Date.now()}.png`;
            const avatarPath = path.join(__dirname, "../uploads", avatarName);
            fs.writeFileSync(avatarPath, png);

            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    avatarUrl: `/uploads/${avatarPath}`,
                },
            });

            res.json(user);
        } catch (error) {
            console.log(`Error in register: ${error}`);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    login: async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "All fields are required!" });
        }
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(400).json({ error: "Invalid login or password" });
            }

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return res.status(400).json({ error: "Invalid login or password" });
            }

            const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY);

            res.json({ token });
        } catch (error) {
            console.error(`Error in login: ${error}`);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    getUserById: async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;

        try {
            const user = await prisma.user.findUnique({
                where: { id },
                include: {
                    followers: true,
                    following: true,
                },
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            const isFollowing = await prisma.follows.findFirst({
                where: {
                    AND: [
                        {
                            followerId: userId,
                        },
                        {
                            followingId: id,
                        },
                    ],
                },
            });

            res.json({ ...user, isFollowing: Boolean(isFollowing) });
        } catch (error) {
            console.error(`Get current error ${error}`);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    updateUser: async (req, res) => {
        const { id } = req.params;
        const { email, name, dateOfBirth, bio, location } = req.body;

        let filePath;

        if (req.file && req.file.path) {
            filePath = req.file.path;
        }

        if (id !== req.user.userId) {
            res.status(403).json({ error: "No access" });
        }

        try {
            if (email) {
                const existingUser = await prisma.user.findFirst({
                    where: { email: email },
                });

                if (existingUser && existingUser.id !== id) {
                    return res.status(400).json({ error: "Email is already in use" });
                }
            }

            const user = await prisma.user.update({
                where: { id },
                data: {
                    email: email || undefined,
                    name: name || undefined,
                    avatarUrl: filePath ? `/${filePath}` : undefined,
                    dateOfBirth: dateOfBirth || undefined,
                    bio: bio || undefined,
                    location: location || undefined,
                },
            });

            res.json(user);
        } catch (error) {
            console.error(`Error in user update: ${error}`);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    current: async (req, res) => {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: req.user.userId,
                },
                include: {
                    followers: {
                        include: {
                            follower: true,
                        },
                    },
                    following: {
                        include: {
                            following: true,
                        },
                    },
                },
            });

            if (!user) {
                return res.status(400).json({ error: "User not found" });
            }

            res.json(user);
        } catch (error) {
            console.log(`Error in current. ${error}`);
            res.status(500).json({ error: "Internal server error" });
        }
    },
};

module.exports = UserController;
