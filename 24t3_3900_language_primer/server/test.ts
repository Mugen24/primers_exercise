import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

(async () => {
  sqlite3.verbose()
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.cached.Database
  })
  db.on("trace", (data) => {
    console.log(data)
  })

  db.exec(`
    CREATE TABLE IF NOT EXISTS student (
      s_id integer primary key,
      name text,
      group_id integer
    );

    CREATE TABLE IF NOT EXISTS groupz(
      g_id integer primary key,
      name text
    );

    CREATE TABLE IF NOT EXISTS student_to_groupz (
      student_id integer,
      group_id integer,
      primary key (student_id, group_id)
    );
    
    insert into student (s_id, name, group_id) values 
      (1, "jimmy", "1"),
      (2, "mah", "1"),
      (3, "dex", "2"),
      (4, "don", "3"),
      (9, "dummy", "5");

    insert into groupz (g_id, name) values 
      (1, "group1"),
      (2, "g2"),
      (3, "g3"),
      (4, "g4"),
      (5, "g5");
  `)

  const data = await db.all(`--sql
    select groupz.g_id as id, groupz.name as name, group_concat(student.name, ',') as members from student
    join groupz on student.group_id = groupz.g_id
    group by g_id 

  `)
  console.log(data)
})() 
