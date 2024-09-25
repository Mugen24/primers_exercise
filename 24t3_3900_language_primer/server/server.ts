import express, { Request, Response } from 'express';
import cors from 'cors';
import sqlite3, { } from 'sqlite3'
import { Database, open } from 'sqlite'
let db: Database
(async () => {
  sqlite3.verbose()
  db = await open({
    filename: ':memory:',
    driver: sqlite3.cached.Database
  })
  db.on("trace", (data: any) => {
    console.log(data)
  })

  db.exec(`
    CREATE TABLE IF NOT EXISTS student (
      id integer primary key,
      name text,
      group_id integer
    );

    CREATE TABLE IF NOT EXISTS groupz(
      id integer primary key,
      name text
    );

    CREATE TRIGGER IF NOT EXISTS cleanup_group 
      after update on groupz
    BEGIN
      DELETE FROM groupz 
        WHERE id NOT IN (select group_id from students);
    END;

    insert into student (id, name, group_id) values 
      (1, "jimmy", "1"),
      (2, "mah", "1"),
      (3, "dex", "2"),
      (4, "don", "3"),
      (9, "dummy", "5");

    insert into groupz (id, name) values 
      (1, "group1"),
      (2, "g2"),
      (3, "g3"),
      (4, "g4"),
      (5, "g5");
  `)
})()


// NOTE: you may modify these interfaces
interface Student {
  id: number;
  name: string;
}

interface GroupSummary {
  id: number;
  groupName: string;
  members: number[];
}

interface Group {
  id: number;
  groupName: string;
  members: Student[];
}

const app = express();
const port = 3902;

app.use(cors());
app.use(express.json());

/**
 * Route to get all groups
 * @route GET /api/groups
 * @returns {Array} - Array of group objects
 */
app.get('/api/groups', async (req: Request, res: Response) => {
  // TODO: (sample response below)
  // res.json([
  //   {
  //     id: 1,
  //     groupName: 'Group 1',
  //     members: [1, 2, 4],
  //   },
  //   {
  //     id: 2,
  //     groupName: 'Group 2',
  //     members: [3, 5],
  //   },
  // ]);
  const groups = await db.all(`--sql
    select groupz.id as id, groupz.name as groupName, group_concat(student.name, ',') as members from student
    join groupz on student.group_id = groupz.id
    group by groupz.id 
  `)

  groups.map((group) => {
    group.members = (group.members as String).split(
      ","
    )
    return group
  })

  return res.status(200).json(groups)
});

/**
 * Route to get all students
 * @route GET /api/students
 * @returns {Array} - Array of student objects
 */
app.get('/api/students', async(req: Request, res: Response) => {
  // TODO: (sample response below)
  // res.json([
  //   { id: 1, name: 'Alice' },
  //   { id: 2, name: 'Bob' },
  //   { id: 3, name: 'Charlie' },
  //   { id: 4, name: 'David' },
  //   { id: 5, name: 'Eve' },
  // ]);
  res.json(await db.all("select id, name from student"))
});

/**
 * Route to add a new group
 * @route POST /api/groups
 * @param {string} req.body.groupName - The name of the group
 * @param {Array} req.body.members - Array of member names
 * @returns {Object} - The created group object
 */
app.post('/api/groups', async (req: Request, res: Response) => {
  // TODO: implement storage of a new group and return their info (sample response below)
  // res.json({
  //   id: 3,
  //   groupName: 'New Group',
  //   members: [1, 2],
  // });

  // First checks if groupName has been taken
  const isGroupExists = await db.get(`--sql
    select * from groupz
    where groupz.name == $groupName
  `, {$groupName: req.body.groupName.toLowerCase()})

  if (isGroupExists) {
    console.log("name already exists")
    res.status(403).send("name already exists")
    return 
  }


  console.log(req.body.members)
  console.log(req.body.members.length)

  if (req.body.members.length <= 0 || req.body.members[0] === '') {
    console.log("needs at least one member")
    res.status(403).send("needs at least one member")
    return 
  }
  
  // Check if student exists
  for (let student_id of req.body.members) {
    const isStudentExists = await db.get(`--sql
      select * from student
      where student.id == $student_id
    `, {$student_id: student_id})

    console.log(isStudentExists)
    if (!isStudentExists) {
      console.log("not valid student")
      res.status(403).send("not valid student")
      return
    }
  }


  const {group_id} = await db.get(`--sql

    insert into groupz (name) values
    (?) returning id as group_id;

  `, (req.body.groupName))

  req.body.members.forEach(async (student_id: any)=> {
    await db.run(`--sql

      update student set
        group_id = $group_id
      where 
        student.id = $student_id

    `, {$group_id: group_id, $student_id: student_id})
  });

  return res.status(200).json({
    id: group_id,
    groupName: req.body.groupName,
    members: req.body.members
  })
});

/**
 * Route to delete a group by ID
 * @route DELETE /api/groups/:id
 * @param {number} req.params.id - The ID of the group to delete
 * @returns {void} - Empty response with status code 204
 */
app.delete('/api/groups/:id', async (req: Request, res: Response) => {
  // TODO: (delete the group with the specified id)
  await db.run(`--sql

    delete from groupz 
    where
      id = $id

  `, {$id: Number(req.params.id)})

  res.sendStatus(204); // send back a 204 (do not modify this line)
});

/**
 * Route to get a group by ID (for fetching group members)
 * @route GET /api/groups/:id
 * @param {number} req.params.id - The ID of the group to retrieve
 * @returns {Object} - The group object with member details
 */
app.get('/api/groups/:id', async(req: Request, res: Response) => {
  // TODO: (sample response below)
  // res.json({
  //   id: 1,
  //   groupName: 'Group 1',
  //   members: [
  //     { id: 1, name: 'Alice' },
  //     { id: 2, name: 'Bob' },
  //     { id: 3, name: 'Charlie' },
  //   ],
  // });

  // const group = await db.get(`--sql
  //   select groupz.id as id, groupz.name as name, group_concat(student.name, ',') as members from student
  //   join 
  //     groupz on student.group_id = groupz.id
  //   where 
  //     student.group_id == $group_id
  //   group by student.group_id
  // `, {group_id: req.params.id})

  const group = await db.get(`--sql
    select groupz.id as id, groupz.name as name from groupz
    where groupz.id == $group_id
  `, {$group_id: Number(req.params.id)})

  group["members"] = await db.all(`--sql
    select id, name from student
    where group_id == $group_id
  `, {$group_id: Number(req.params.id)})

  console.log(group)

  if (!group) {
    return res.status(404).send("Group not found");
  } else {
    return res.status(200).json(group)
  }

});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
